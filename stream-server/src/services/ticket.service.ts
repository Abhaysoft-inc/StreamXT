import { jwtVerify } from 'jose';
import { env } from '../config/env';

const ticketSecret = new TextEncoder().encode(env.STREAM_TICKET_SECRET);

export type StreamQuality = '720p30' | '1080p30' | '720p60';
export type StreamMode = 'cloud' | 'browser';

export interface StreamTicketClaims {
  sessionId: string;
  userId: string;
  destination: string;
  mode: StreamMode;
  roomId: string | null;
  quality: StreamQuality;
  rtmpTargets: string[];
}

export async function verifyStreamTicket(token: string): Promise<StreamTicketClaims> {
  const { payload } = await jwtVerify(token, ticketSecret, {
    algorithms: ['HS256'],
  });

  if (typeof payload.sessionId !== 'string' || typeof payload.userId !== 'string') {
    throw new Error('Invalid stream ticket claims');
  }

  const rtmpTargets: string[] = [];
  if (Array.isArray(payload.rtmpTargets)) {
    for (const item of payload.rtmpTargets) {
      if (typeof item === 'string' && item.trim()) {
        rtmpTargets.push(item.trim());
      }
    }
  } else if (typeof payload.rtmpTarget === 'string' && payload.rtmpTarget.trim()) {
    rtmpTargets.push(payload.rtmpTarget.trim());
  }

  if (rtmpTargets.length === 0) {
    throw new Error('No RTMP targets in stream ticket');
  }

  const quality: StreamQuality =
    payload.quality === '1080p30' || payload.quality === '720p60'
      ? payload.quality
      : '720p30';

  const mode: StreamMode = payload.mode === 'browser' ? 'browser' : 'cloud';

  return {
    sessionId: payload.sessionId,
    userId: payload.userId,
    destination: typeof payload.destination === 'string' ? payload.destination : 'youtube',
    mode,
    roomId: typeof payload.roomId === 'string' ? payload.roomId : null,
    quality,
    rtmpTargets,
  };
}
