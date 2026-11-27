import type { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../errors/AppError';
import { ErrorCode } from '../errors/errorCodes';
import { verifyAccessToken, type AccessTokenPayload } from '../modules/auth/token.service';
import { prisma } from '../services/db';
import { ACCESS_COOKIE_NAME } from '../utils/cookies';

declare global {
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload;
    }
  }
}

function extractAccessToken(req: Request): string | null {
  const cookieToken = req.cookies?.[ACCESS_COOKIE_NAME];
  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return cookieToken;
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    return token.length > 0 ? token : null;
  }

  return null;
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractAccessToken(req);
  if (!token) {
    next(new UnauthorizedError('Authentication required', ErrorCode.UNAUTHORIZED));
    return;
  }

  const payload = await verifyAccessToken(token);

  const session = await prisma.session.findUnique({
    where: { id: payload.sessionId },
    select: { id: true, revokedAt: true, expiresAt: true },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    next(new UnauthorizedError('Session is no longer active', ErrorCode.TOKEN_EXPIRED));
    return;
  }

  req.auth = payload;
  next();
}
