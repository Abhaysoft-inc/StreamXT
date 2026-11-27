import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { Socket } from 'socket.io';
import { env } from '../config/env';
import { cloudCompositor } from './cloudCompositor';
import { reportStreamStatus } from './statusReporter';
import type { StreamQuality, StreamTicketClaims } from './ticket.service';

interface QualityPreset {
  fps: number;
  gop: number;
  videoBitrate: string;
  bufSize: string;
  audioBitrate: string;
}

const QUALITY_PRESETS: Record<StreamQuality, QualityPreset> = {
  '720p30': {
    fps: 30,
    gop: 60,
    videoBitrate: '2500k',
    bufSize: '5000k',
    audioBitrate: '128k',
  },
  '720p60': {
    fps: 60,
    gop: 120,
    videoBitrate: '4000k',
    bufSize: '8000k',
    audioBitrate: '128k',
  },
  '1080p30': {
    fps: 30,
    gop: 60,
    videoBitrate: '4500k',
    bufSize: '9000k',
    audioBitrate: '160k',
  },
};

interface ActiveStreamWorker {
  sessionId: string;
  controlSocket: Socket;
  process: ChildProcessWithoutNullStreams;
  rtmpTargets: string[];
  startedAtMs: number;
  pendingChunks: Buffer[];
  pendingBytes: number;
  draining: boolean;
  droppedChunks: number;
  lastErrorLine: string;
  stopping: boolean;
  reportedLive: boolean;
}

function redactTarget(rtmpTarget: string): string {
  const lastSlash = rtmpTarget.lastIndexOf('/');
  if (lastSlash === -1) return '[REDACTED]';
  return `${rtmpTarget.slice(0, lastSlash)}/[REDACTED]`;
}

function redactAllTargets(text: string, targets: string[]): string {
  let clean = text;
  for (const t of targets) {
    if (t) {
      clean = clean.split(t).join(redactTarget(t));
    }
  }
  return clean;
}

function buildOutputArgs(rtmpTargets: string[]): string[] {
  if (rtmpTargets.length === 1) {
    return ['-flvflags', 'no_duration_filesize', '-f', 'flv', rtmpTargets[0]!];
  }

  // Single encode fanned out across multiple RTMP destinations using FFmpeg tee muxer
  const teeSpec = rtmpTargets
    .map((url) => `[f=flv:onfail=ignore]${url}`)
    .join('|');

  return ['-flags', '+global_header', '-map', '0:v', '-map', '0:a', '-f', 'tee', teeSpec];
}

export class FfmpegStreamManager {
  private readonly workers = new Map<string, ActiveStreamWorker>();

  getActiveCount(): number {
    return this.workers.size;
  }

  hasCapacity(): boolean {
    return this.workers.size < env.MAX_CONCURRENT_STREAMS;
  }

  attachControlSocket(sessionId: string, socket: Socket): void {
    const worker = this.workers.get(sessionId);
    if (worker) {
      worker.controlSocket = socket;
    }
  }

  startStream(
    socket: Socket,
    claims: StreamTicketClaims,
    options: { isControlSocket?: boolean } = { isControlSocket: true },
  ): void {
    const isControlSocket = options.isControlSocket !== false;

    if (this.workers.has(claims.sessionId)) {
      if (isControlSocket) {
        this.attachControlSocket(claims.sessionId, socket);
      }
      socket.emit('stream:ready', {
        sessionId: claims.sessionId,
        mode: claims.mode,
        targetCount: claims.rtmpTargets.length,
      });
      return;
    }

    if (!this.hasCapacity()) {
      socket.emit('stream:error', {
        sessionId: claims.sessionId,
        message: 'Ingest worker is at full capacity. Please try again shortly.',
      });
      void reportStreamStatus({
        sessionId: claims.sessionId,
        status: 'FAILED',
        errorMessage: 'Worker capacity exceeded',
      });
      return;
    }

    const preset = QUALITY_PRESETS[claims.quality] ?? QUALITY_PRESETS['720p30'];

    const ffmpegArgs = [
      '-hide_banner',
      '-loglevel',
      'warning',
      '-stats',
      '-fflags',
      '+genpts',
      '-i',
      'pipe:0',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-tune',
      'zerolatency',
      '-pix_fmt',
      'yuv420p',
      '-r',
      String(preset.fps),
      '-g',
      String(preset.gop),
      '-b:v',
      preset.videoBitrate,
      '-maxrate',
      preset.videoBitrate,
      '-bufsize',
      preset.bufSize,
      '-c:a',
      'aac',
      '-ar',
      '44100',
      '-b:a',
      preset.audioBitrate,
      ...buildOutputArgs(claims.rtmpTargets),
    ];

    const child = spawn(env.FFMPEG_PATH, ffmpegArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const worker: ActiveStreamWorker = {
      sessionId: claims.sessionId,
      controlSocket: socket,
      process: child,
      rtmpTargets: claims.rtmpTargets,
      startedAtMs: Date.now(),
      pendingChunks: [],
      pendingBytes: 0,
      draining: false,
      droppedChunks: 0,
      lastErrorLine: '',
      stopping: false,
      reportedLive: false,
    };

    this.workers.set(claims.sessionId, worker);
    const summary = claims.rtmpTargets.map(redactTarget).join(', ');
    console.log(
      `[stream:${claims.sessionId}] Started FFmpeg (${claims.quality}, ${claims.mode}, ${claims.rtmpTargets.length} targets) -> ${summary}`,
    );

    child.stdin.on('drain', () => {
      this.flushQueue(worker);
    });

    child.stdin.on('error', (err) => {
      if (!worker.stopping) {
        console.warn(`[stream:${claims.sessionId}] stdin error:`, err.message);
      }
    });

    child.stderr.on('data', (raw: Buffer) => {
      const text = raw.toString('utf8');
      this.handleStderr(worker, text);
    });

    child.on('error', (err) => {
      console.error(`[stream:${claims.sessionId}] FFmpeg spawn error:`, err.message);
      this.workers.delete(claims.sessionId);
      void cloudCompositor.stopCompositor(claims.sessionId);
      worker.controlSocket.emit('stream:error', {
        sessionId: claims.sessionId,
        message: 'Failed to launch FFmpeg encoder on stream server',
      });
      void reportStreamStatus({
        sessionId: claims.sessionId,
        status: 'FAILED',
        errorMessage: err.message,
      });
    });

    child.on('close', (code, signal) => {
      this.workers.delete(claims.sessionId);
      void cloudCompositor.stopCompositor(claims.sessionId);
      const durationSeconds = Math.max(0, Math.floor((Date.now() - worker.startedAtMs) / 1000));
      const cleanStop = worker.stopping || code === 0 || signal === 'SIGTERM';

      console.log(
        `[stream:${claims.sessionId}] Closed (code=${code}, signal=${signal}, duration=${durationSeconds}s)`,
      );

      if (cleanStop) {
        worker.controlSocket.emit('stream:ended', {
          sessionId: claims.sessionId,
          durationSeconds,
        });
        void reportStreamStatus({
          sessionId: claims.sessionId,
          status: 'ENDED',
          durationSeconds,
        });
      } else {
        const sanitizedError = redactAllTargets(
          worker.lastErrorLine,
          worker.rtmpTargets,
        ).slice(0, 300);
        const message =
          sanitizedError || `Streaming encoder exited unexpectedly (code ${code ?? 'unknown'})`;
        worker.controlSocket.emit('stream:error', {
          sessionId: claims.sessionId,
          message,
        });
        void reportStreamStatus({
          sessionId: claims.sessionId,
          status: 'FAILED',
          durationSeconds,
          errorMessage: message,
        });
      }
    });

    socket.emit('stream:ready', {
      sessionId: claims.sessionId,
      mode: claims.mode,
      targetCount: claims.rtmpTargets.length,
    });
  }

  writeChunk(sessionId: string, chunk: Buffer): void {
    const worker = this.workers.get(sessionId);
    if (!worker || worker.stopping || worker.process.stdin.destroyed) return;

    if (worker.draining || worker.pendingChunks.length > 0) {
      worker.pendingChunks.push(chunk);
      worker.pendingBytes += chunk.length;

      while (worker.pendingBytes > env.MAX_BACKPRESSURE_BYTES && worker.pendingChunks.length > 1) {
        const dropped = worker.pendingChunks.shift();
        if (dropped) {
          worker.pendingBytes -= dropped.length;
          worker.droppedChunks += 1;
        }
      }
      return;
    }

    const canContinue = worker.process.stdin.write(chunk);
    if (!canContinue) {
      worker.draining = true;
    }
  }

  private flushQueue(worker: ActiveStreamWorker): void {
    if (worker.stopping || worker.process.stdin.destroyed) return;
    worker.draining = false;

    while (worker.pendingChunks.length > 0) {
      const next = worker.pendingChunks.shift()!;
      worker.pendingBytes -= next.length;
      const canContinue = worker.process.stdin.write(next);
      if (!canContinue) {
        worker.draining = true;
        return;
      }
    }
  }

  private handleStderr(worker: ActiveStreamWorker, text: string): void {
    const fpsMatch = /fps=\s*([\d.]+)/.exec(text);
    const bitrateMatch = /bitrate=\s*([\d.]+)kbits\/s/.exec(text);

    if (fpsMatch || bitrateMatch) {
      if (!worker.reportedLive) {
        worker.reportedLive = true;
        void reportStreamStatus({
          sessionId: worker.sessionId,
          status: 'LIVE',
        });
      }

      const fps = fpsMatch ? Number(fpsMatch[1]) : 0;
      const bitrateKbps = bitrateMatch ? Math.round(Number(bitrateMatch[1])) : 0;
      const uptimeSeconds = Math.floor((Date.now() - worker.startedAtMs) / 1000);

      worker.controlSocket.emit('stream:stats', {
        sessionId: worker.sessionId,
        fps,
        bitrateKbps,
        uptimeSeconds,
        droppedChunks: worker.droppedChunks,
        health: worker.droppedChunks > 5 ? 'degraded' : 'good',
      });
      return;
    }

    const trimmed = text.trim();
    if (trimmed) {
      worker.lastErrorLine = trimmed;
    }
  }

  stopStream(sessionId: string): void {
    void cloudCompositor.stopCompositor(sessionId);

    const worker = this.workers.get(sessionId);
    if (!worker || worker.stopping) return;

    worker.stopping = true;
    worker.pendingChunks = [];
    worker.pendingBytes = 0;

    if (!worker.process.stdin.destroyed) {
      worker.process.stdin.end();
    }

    const forceTimer = setTimeout(() => {
      if (!worker.process.killed) {
        worker.process.kill('SIGTERM');
      }
    }, 3000);

    worker.process.once('close', () => {
      clearTimeout(forceTimer);
    });
  }

  async stopAll(): Promise<void> {
    await cloudCompositor.stopAll();
    const ids = Array.from(this.workers.keys());
    for (const id of ids) {
      this.stopStream(id);
    }
  }
}

export const streamManager = new FfmpegStreamManager();
