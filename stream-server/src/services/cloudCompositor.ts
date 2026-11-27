import fs from 'node:fs';
import puppeteer, { type Browser } from 'puppeteer-core';
import { env } from '../config/env';

const CANDIDATE_PATHS = [
  env.CHROMIUM_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
].filter(Boolean);

export function resolveChromiumExecutable(): string | null {
  for (const candidate of CANDIDATE_PATHS) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

class CloudCompositorManager {
  private readonly browsers = new Map<string, Browser>();

  getActiveCount(): number {
    return this.browsers.size;
  }

  async startCompositor(params: {
    sessionId: string;
    roomId: string;
    ticket: string;
    quality: string;
    onError: (message: string) => void;
  }): Promise<void> {
    if (this.browsers.has(params.sessionId)) {
      return;
    }

    const executablePath = resolveChromiumExecutable();
    if (!executablePath) {
      throw new Error(
        'No Chromium/Chrome/Edge executable found on stream-server. Set CHROMIUM_PATH or use Browser Encode mode.',
      );
    }

    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--autoplay-policy=no-user-gesture-required',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--window-size=1280,720',
      ],
    });

    this.browsers.set(params.sessionId, browser);

    browser.on('disconnected', () => {
      this.browsers.delete(params.sessionId);
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });

      page.on('pageerror', (err) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[compositor:${params.sessionId}] Page error:`, message);
      });

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          console.warn(`[compositor:${params.sessionId}] Console error:`, msg.text());
        }
      });

      const renderUrl = `${env.CLIENT_URL}/render/${encodeURIComponent(
        params.sessionId,
      )}?room=${encodeURIComponent(params.roomId)}&quality=${encodeURIComponent(
        params.quality,
      )}&ticket=${encodeURIComponent(params.ticket)}`;

      await page.goto(renderUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log(`[compositor:${params.sessionId}] Headless renderer launched`);
    } catch (err) {
      await this.stopCompositor(params.sessionId);
      const message = err instanceof Error ? err.message : 'Failed to load cloud render page';
      params.onError(message);
    }
  }

  async stopCompositor(sessionId: string): Promise<void> {
    const browser = this.browsers.get(sessionId);
    if (!browser) return;
    this.browsers.delete(sessionId);

    try {
      await browser.close();
      console.log(`[compositor:${sessionId}] Headless renderer closed`);
    } catch (err) {
      console.warn(`[compositor:${sessionId}] Error closing browser:`, err);
    }
  }

  async stopAll(): Promise<void> {
    const ids = Array.from(this.browsers.keys());
    await Promise.all(ids.map((id) => this.stopCompositor(id)));
  }
}

export const cloudCompositor = new CloudCompositorManager();
