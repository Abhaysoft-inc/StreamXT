import type { CookieOptions, Response } from 'express';
import { env } from '../config/env';

export const ACCESS_COOKIE_NAME = 'streamxt_access';
export const REFRESH_COOKIE_NAME = 'streamxt_refresh';
export const OAUTH_COOKIE_NAME = 'streamxt_oauth_tx';

const isProd = env.NODE_ENV === 'production';

function parseTtlToMs(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl.trim());
  if (!match) return 15 * 60 * 1000;
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * (multipliers[unit ?? 'm'] ?? 60 * 1000);
}

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax',
  path: '/',
};

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  res.cookie(ACCESS_COOKIE_NAME, accessToken, {
    ...baseCookieOptions,
    maxAge: parseTtlToMs(env.ACCESS_TOKEN_TTL),
  });

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...baseCookieOptions,
    maxAge: env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE_NAME, baseCookieOptions);
  res.clearCookie(REFRESH_COOKIE_NAME, baseCookieOptions);
}

export function setOAuthCookie(res: Response, token: string): void {
  res.cookie(OAUTH_COOKIE_NAME, token, {
    ...baseCookieOptions,
    maxAge: 10 * 60 * 1000,
  });
}

export function clearOAuthCookie(res: Response): void {
  res.clearCookie(OAUTH_COOKIE_NAME, baseCookieOptions);
}
