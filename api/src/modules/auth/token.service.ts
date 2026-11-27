import crypto from 'node:crypto';
import type { User } from '@prisma/client';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '../../config/env';
import { UnauthorizedError } from '../../errors/AppError';
import { ErrorCode } from '../../errors/errorCodes';
import { prisma } from '../../services/db';
import { generateOpaqueToken, sha256 } from '../../utils/crypto';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  username: string | null;
  sessionId: string;
}

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const oauthStateSecret = new TextEncoder().encode(env.OAUTH_STATE_SECRET);

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({
    email: payload.email,
    username: payload.username,
    sessionId: payload.sessionId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(env.ACCESS_TOKEN_TTL)
    .sign(accessSecret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, accessSecret, {
    algorithms: ['HS256'],
  });

  if (!payload.sub || typeof payload.email !== 'string' || typeof payload.sessionId !== 'string') {
    throw new UnauthorizedError('Invalid access token claims', ErrorCode.INVALID_TOKEN);
  }

  return {
    sub: payload.sub,
    email: payload.email,
    username: typeof payload.username === 'string' ? payload.username : null,
    sessionId: payload.sessionId,
  };
}

export async function issueSessionTokens(
  user: User,
  meta: { userAgent?: string; ipAddress?: string; tokenFamilyId?: string },
): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
  const refreshToken = generateOpaqueToken(48);
  const refreshTokenHash = sha256(refreshToken);
  const tokenFamilyId = meta.tokenFamilyId ?? crypto.randomUUID();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash,
      tokenFamilyId,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt,
    },
  });

  const accessToken = await signAccessToken({
    sub: user.id,
    email: user.email,
    username: user.username,
    sessionId: session.id,
  });

  return { accessToken, refreshToken, sessionId: session.id };
}

export async function rotateRefreshToken(
  refreshToken: string,
  meta: { userAgent?: string; ipAddress?: string },
): Promise<{ user: User; accessToken: string; refreshToken: string }> {
  const refreshTokenHash = sha256(refreshToken);

  const existing = await prisma.session.findUnique({
    where: { refreshTokenHash },
    include: { user: true },
  });

  if (!existing) {
    throw new UnauthorizedError('Invalid refresh session', ErrorCode.INVALID_TOKEN);
  }

  if (existing.revokedAt) {
    // Refresh token reuse detected: revoke the entire token family immediately.
    await prisma.session.updateMany({
      where: { tokenFamilyId: existing.tokenFamilyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new UnauthorizedError('Session revoked due to token reuse', ErrorCode.INVALID_TOKEN);
  }

  if (existing.expiresAt <= new Date()) {
    await prisma.session.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });
    throw new UnauthorizedError('Refresh session expired', ErrorCode.TOKEN_EXPIRED);
  }

  await prisma.session.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });

  const tokens = await issueSessionTokens(existing.user, {
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
    tokenFamilyId: existing.tokenFamilyId,
  });

  return {
    user: existing.user,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

export async function revokeSessionByRefreshToken(refreshToken?: string): Promise<void> {
  if (!refreshToken) return;
  const refreshTokenHash = sha256(refreshToken);

  await prisma.session.updateMany({
    where: { refreshTokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export interface OAuthStatePayload {
  state: string;
  provider: 'github' | 'google';
  codeVerifier?: string;
  redirectTo: string;
}

export async function signOAuthTransaction(payload: OAuthStatePayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(oauthStateSecret);
}

export async function verifyOAuthTransaction(token: string): Promise<OAuthStatePayload> {
  const { payload } = await jwtVerify(token, oauthStateSecret, {
    algorithms: ['HS256'],
  });

  if (
    typeof payload.state !== 'string' ||
    (payload.provider !== 'github' && payload.provider !== 'google') ||
    typeof payload.redirectTo !== 'string'
  ) {
    throw new UnauthorizedError('Invalid OAuth state token', ErrorCode.INVALID_TOKEN);
  }

  return {
    state: payload.state,
    provider: payload.provider,
    codeVerifier: typeof payload.codeVerifier === 'string' ? payload.codeVerifier : undefined,
    redirectTo: payload.redirectTo,
  };
}
