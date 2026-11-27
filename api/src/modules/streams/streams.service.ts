import { SignJWT } from 'jose';
import { env } from '../../config/env';
import { ExternalServiceError, NotFoundError } from '../../errors/AppError';
import { ErrorCode } from '../../errors/errorCodes';
import { prisma } from '../../services/db';

const streamTicketSecret = new TextEncoder().encode(env.STREAM_TICKET_SECRET);

export type StreamQuality = '720p30' | '1080p30' | '720p60';

interface WorkerHealth {
  url: string;
  activeStreams: number;
  maxStreams: number;
  capacityRemaining: number;
}

function getWorkerUrls(): string[] {
  return env.STREAM_SERVER_URLS.split(',')
    .map((u) => u.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

/**
 * Queries configured stream-server instances and picks the least-loaded worker
 * with available capacity for horizontal scaling.
 */
async function selectBestWorker(): Promise<string> {
  const candidates = getWorkerUrls();
  if (candidates.length === 0) {
    throw new ExternalServiceError(
      'No streaming ingest workers are configured',
      ErrorCode.INTERNAL_SERVER_ERROR,
    );
  }

  const results = await Promise.all(
    candidates.map(async (url): Promise<WorkerHealth | null> => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1500);
        const res = await fetch(`${url}/health`, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) return null;
        const body = (await res.json()) as {
          data?: { activeStreams?: number; maxStreams?: number; capacityRemaining?: number };
        };
        const activeStreams = body.data?.activeStreams ?? 0;
        const maxStreams = body.data?.maxStreams ?? 10;
        const capacityRemaining = body.data?.capacityRemaining ?? maxStreams - activeStreams;
        if (capacityRemaining <= 0) return null;
        return { url, activeStreams, maxStreams, capacityRemaining };
      } catch {
        return null;
      }
    }),
  );

  const healthy = results.filter((w): w is WorkerHealth => w !== null);
  if (healthy.length > 0) {
    healthy.sort((a, b) => b.capacityRemaining - a.capacityRemaining);
    return healthy[0]!.url;
  }

  // Fallback to primary configured URL if health check is momentarily unreachable
  return candidates[0]!;
}

function buildRtmpTarget(input: {
  destination: 'youtube' | 'custom_rtmp';
  streamKey: string;
  rtmpUrl?: string;
}): string {
  if (input.destination === 'youtube') {
    return `rtmp://a.rtmp.youtube.com/live2/${input.streamKey}`;
  }

  const base = (input.rtmpUrl || '').replace(/\/+$/, '');
  return `${base}/${input.streamKey}`;
}

export async function createStreamSession(
  userId: string,
  input: {
    destination: 'youtube' | 'custom_rtmp';
    streamKey: string;
    rtmpUrl?: string;
    title?: string;
    quality: StreamQuality;
  },
) {
  const workerUrl = await selectBestWorker();
  const rtmpTarget = buildRtmpTarget(input);

  const session = await prisma.streamSession.create({
    data: {
      userId,
      title: input.title || (input.destination === 'youtube' ? 'YouTube Live' : 'Custom RTMP Live'),
      destination: input.destination,
      quality: input.quality,
      status: 'PREPARING',
      workerUrl,
    },
  });

  const ticket = await new SignJWT({
    sessionId: session.id,
    userId,
    destination: input.destination,
    quality: input.quality,
    rtmpTarget,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(streamTicketSecret);

  return {
    sessionId: session.id,
    ingestUrl: workerUrl,
    ticket,
    quality: session.quality,
  };
}

export async function listUserStreamSessions(userId: string) {
  return prisma.streamSession.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      title: true,
      destination: true,
      quality: true,
      status: true,
      startedAt: true,
      endedAt: true,
      durationSeconds: true,
      errorMessage: true,
      createdAt: true,
    },
  });
}

export async function updateStreamSessionStatus(input: {
  sessionId: string;
  status: 'LIVE' | 'ENDED' | 'FAILED';
  durationSeconds?: number;
  errorMessage?: string;
}) {
  const existing = await prisma.streamSession.findUnique({
    where: { id: input.sessionId },
  });

  if (!existing) {
    throw new NotFoundError('Stream session not found');
  }

  const now = new Date();
  return prisma.streamSession.update({
    where: { id: input.sessionId },
    data: {
      status: input.status,
      ...(input.status === 'LIVE' && !existing.startedAt ? { startedAt: now } : {}),
      ...(input.status === 'ENDED' || input.status === 'FAILED' ? { endedAt: now } : {}),
      ...(typeof input.durationSeconds === 'number'
        ? { durationSeconds: input.durationSeconds }
        : {}),
      ...(input.errorMessage ? { errorMessage: input.errorMessage } : {}),
    },
  });
}
