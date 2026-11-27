import { env } from '../config/env';

export async function reportStreamStatus(payload: {
  sessionId: string;
  status: 'LIVE' | 'ENDED' | 'FAILED';
  durationSeconds?: number;
  errorMessage?: string;
}): Promise<void> {
  try {
    await fetch(`${env.API_URL}/api/v1/streams/internal/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': env.INTERNAL_WORKER_SECRET,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn(`[worker] Failed to report status for ${payload.sessionId}:`, err);
  }
}
