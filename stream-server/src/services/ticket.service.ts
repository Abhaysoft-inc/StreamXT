import { jwtVerify } from 'jose';
import { env } from '../config/env';

const ticketSecret = new TextEncoder().encode(env.STREAM_TICKET_SECRET);

export type StreamQuality = '720p30' | '1080p30' | '720p60';

export interface StreamTicketClaims {
  sessionId: string;
  userId: string;
  destination: 'youtube' | 'custom_rtmp';
  quality: StreamQuality;
  rtmpTarget: string;
}

export async function verifyStreamTicket(token: string): Promise<StreamTicketClaims> {
  const { payload } = await jwtVerify(token, ticketSecret, {
    algorithms: ['HS256'],
  });

  if (
    typeof payload.sessionId !== 'string' ||
    typeof payload.userId !== 'string' ||
    typeof payload.rtmpTarget !== 'string' ||
    (payload.destination !== 'youtube' && payload.destination !== 'custom_rtmp')
  ) {
    throw new Error('Invalid stream ticket claims');
  }

  const quality: StreamQuality =
    payload.quality === '1080p30' || payload.quality === '720p60'
      ? payload.quality
      : '720p30';

  return {
    sessionId: payload.sessionId,
    userId: payload.userId,
    destination: payload.destination,
    quality,
    rtmpTarget: payload.rtmpTarget,
  };
}
