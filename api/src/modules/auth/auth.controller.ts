import type { Request, Response } from 'express';
import { env } from '../../config/env';
import { UnauthorizedError } from '../../errors/AppError';
import { ErrorCode } from '../../errors/errorCodes';
import {
  clearAuthCookies,
  clearOAuthCookie,
  OAUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  setAuthCookies,
  setOAuthCookie,
} from '../../utils/cookies';
import { sendSuccess } from '../../utils/response';
import * as authService from './auth.service';
import * as oauthService from './oauth.service';

function extractMeta(req: Request): authService.RequestMeta {
  return {
    userAgent: req.get('user-agent') ?? undefined,
    ipAddress: req.ip,
  };
}

export async function signup(req: Request, res: Response): Promise<void> {
  const result = await authService.signup(req.body, extractMeta(req));

  if (!result.requiresVerification) {
    setAuthCookies(res, result.accessToken, result.refreshToken);
    sendSuccess(
      res,
      {
        requiresVerification: false,
        user: result.user,
      },
      201,
    );
    return;
  }

  sendSuccess(
    res,
    {
      requiresVerification: true,
      email: result.email,
      resendAfterSeconds: result.resendAfterSeconds,
    },
    201,
  );
}

export async function verifySignupOtp(req: Request, res: Response): Promise<void> {
  const result = await authService.verifySignupOtp(req.body, extractMeta(req));
  setAuthCookies(res, result.accessToken, result.refreshToken);
  sendSuccess(res, { user: result.user });
}

export async function resendOtp(req: Request, res: Response): Promise<void> {
  const result = await authService.resendOtp(req.body);
  sendSuccess(res, result);
}

export async function identifySignIn(req: Request, res: Response): Promise<void> {
  const result = await authService.identifySignIn(req.body.email);
  sendSuccess(res, result);
}

export async function signInWithPassword(req: Request, res: Response): Promise<void> {
  const result = await authService.signInWithPassword(req.body, extractMeta(req));
  setAuthCookies(res, result.accessToken, result.refreshToken);
  sendSuccess(res, { user: result.user });
}

export async function sendSignInOtp(req: Request, res: Response): Promise<void> {
  const result = await authService.sendSignInOtp(req.body.email);
  sendSuccess(res, result);
}

export async function verifySignInOtp(req: Request, res: Response): Promise<void> {
  const result = await authService.verifySignInOtp(req.body, extractMeta(req));
  setAuthCookies(res, result.accessToken, result.refreshToken);
  sendSuccess(res, { user: result.user });
}

export async function completeProfile(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    throw new UnauthorizedError('Authentication required', ErrorCode.UNAUTHORIZED);
  }
  const user = await authService.completeProfile(req.auth.sub, req.body);
  sendSuccess(res, { user });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    throw new UnauthorizedError('Authentication required', ErrorCode.UNAUTHORIZED);
  }
  const user = await authService.getCurrentUser(req.auth.sub);
  sendSuccess(res, { user });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;

  try {
    const result = await authService.refreshSession(refreshToken, extractMeta(req));
    setAuthCookies(res, result.accessToken, result.refreshToken);
    sendSuccess(res, { user: result.user });
  } catch (err) {
    clearAuthCookies(res);
    throw err;
  }
}

export async function refreshRedirect(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  const target = oauthService.sanitizeRedirectPath(
    typeof req.query.redirect === 'string' ? req.query.redirect : undefined,
  );

  try {
    const result = await authService.refreshSession(refreshToken, extractMeta(req));
    setAuthCookies(res, result.accessToken, result.refreshToken);
    res.redirect(`${env.CLIENT_URL}${target}`);
  } catch {
    clearAuthCookies(res);
    res.redirect(`${env.CLIENT_URL}/auth/signin?redirect=${encodeURIComponent(target)}`);
  }
}

export async function signOut(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  await authService.signOut(refreshToken);
  clearAuthCookies(res);
  sendSuccess(res, { signedOut: true });
}

export async function startOAuth(req: Request, res: Response): Promise<void> {
  const provider = req.params.provider as oauthService.OAuthProvider;
  const redirectTo = typeof req.query.redirect === 'string' ? req.query.redirect : '/dashboard';

  const { url, txCookieToken } = await oauthService.createOAuthAuthorizationUrl(
    provider,
    redirectTo,
  );

  setOAuthCookie(res, txCookieToken);
  res.redirect(url);
}

export async function oauthCallback(req: Request, res: Response): Promise<void> {
  const provider = req.params.provider as oauthService.OAuthProvider;
  const code = typeof req.query.code === 'string' ? req.query.code : undefined;
  const state = typeof req.query.state === 'string' ? req.query.state : undefined;
  const oauthError = typeof req.query.error === 'string' ? req.query.error : undefined;
  const txCookieToken = req.cookies?.[OAUTH_COOKIE_NAME] as string | undefined;

  clearOAuthCookie(res);

  if (oauthError) {
    res.redirect(
      `${env.CLIENT_URL}/auth/signin?oauth_error=${encodeURIComponent('OAuth login was cancelled or denied')}`,
    );
    return;
  }

  try {
    const result = await oauthService.handleOAuthCallback({
      provider,
      code,
      state,
      txCookieToken,
      meta: extractMeta(req),
    });

    setAuthCookies(res, result.accessToken, result.refreshToken);
    res.redirect(`${env.CLIENT_URL}${result.redirectTo}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OAuth authentication failed';
    res.redirect(`${env.CLIENT_URL}/auth/signin?oauth_error=${encodeURIComponent(message)}`);
  }
}
