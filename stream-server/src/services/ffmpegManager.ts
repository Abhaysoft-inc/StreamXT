import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { Socket } from 'socket.io';
import { env } from '../config/env';
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
  socket: Socket;
  process: ChildProcessWithoutNullStreams;
  rtmpTarget: string;
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

export class FfmpegStreamManager {
  private readonly workers = new Map<string, ActiveStreamWorker>();

  getActiveCount(): number {
    return this.workers.size;
  }

  hasCapacity(): boolean {
    return this.workers.size < env.MAX_CONCURRENT_STREAMS;
  }

  startStream(socket: Socket, claims: StreamTicketClaims): void {
    if (this.workers.has(claims.sessionId)) {
      socket.emit('stream:ready', { sessionId: claims.sessionId });
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
      '-flvflags',
      'no_duration_filesize',
      '-f',
      'flv',
      claims.rtmpTarget,
    ];

    const child = spawn(env.FFMPEG_PATH, ffmpegArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const worker: ActiveStreamWorker = {
      sessionId: claims.sessionId,
      socket,
      process: child,
      rtmpTarget: claims.rtmpTarget,
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
    console.log(
      `[stream:${claims.sessionId}] Started FFmpeg (${claims.quality}) -> ${redactTarget(claims.rtmpTarget)}`,
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
      socket.emit('stream:error', {
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
      const durationSeconds = Math.max(0, Math.floor((Date.now() - worker.startedAtMs) / 1000));
      const cleanStop = worker.stopping || code === 0 || signal === 'SIGTERM';

      console.log(
        `[stream:${claims.sessionId}] Closed (code=${code}, signal=${signal}, duration=${durationSeconds}s)`,
      );

      if (cleanStop) {
        socket.emit('stream:ended', { sessionId: claims.sessionId, durationSeconds });
        void reportStreamStatus({
          sessionId: claims.sessionId,
          status: 'ENDED',
          durationSeconds,
        });
      } else {
        const sanitizedError = worker.lastErrorLine
          .replace(claims.rtmpTarget, redactTarget(claims.rtmpTarget))
          .slice(0, 300);
        const message =
          sanitizedError || `Streaming encoder exited unexpectedly (code ${code ?? 'unknown'})`;
        socket.emit('stream:error', { sessionId: claims.sessionId, message });
        void reportStreamStatus({
          sessionId: claims.sessionId,
          status: 'FAILED',
          durationSeconds,
          errorMessage: message,
        });
      }
    });

    socket.emit('stream:ready', { sessionId: claims.sessionId });
  }

  writeChunk(sessionId: string, chunk: Buffer): void {
    const worker = this.workers.get(sessionId);
    if (!worker || worker.stopping || worker.process.stdin.destroyed) return;

    if (worker.draining || worker.pendingChunks.length > 0) {
      worker.pendingChunks.push(chunk);
      worker.pendingBytes += chunk.length;

      // Bound queued memory under slow RTMP egress so workers stay stable at scale
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

      worker.socket.emit('stream:stats', {
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
    const ids = Array.from(this.workers.keys());
    for (const id of ids) {
      this.stopStream(id);
    }
  }
}

export const streamManager = new FfmpegStreamManager();
