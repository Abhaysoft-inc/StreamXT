import type { Request, Response } from 'express';
import { env } from '../../config/env';
import { UnauthorizedError } from '../../errors/AppError';
import { ErrorCode } from '../../errors/errorCodes';
import { sendSuccess } from '../../utils/response';
import * as streamsService from './streams.service';

export async function createSession(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    throw new UnauthorizedError('Authentication required', ErrorCode.UNAUTHORIZED);
  }
  const session = await streamsService.createStreamSession(req.auth.sub, req.body);
  sendSuccess(res, session, 201);
}

export async function listSessions(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    throw new UnauthorizedError('Authentication required', ErrorCode.UNAUTHORIZED);
  }
  const sessions = await streamsService.listUserStreamSessions(req.auth.sub);
  sendSuccess(res, { sessions });
}

export async function updateStatusFromWorker(req: Request, res: Response): Promise<void> {
  const workerSecret = req.get('x-worker-secret');
  if (!workerSecret || workerSecret !== env.INTERNAL_WORKER_SECRET) {
    throw new UnauthorizedError('Invalid worker authorization', ErrorCode.UNAUTHORIZED);
  }

  const updated = await streamsService.updateStreamSessionStatus(req.body);
  sendSuccess(res, { session: updated });
}
