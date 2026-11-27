import { env } from '../../config/env';
import {
  BadRequestError,
  ExternalServiceError,
  UnauthorizedError,
} from '../../errors/AppError';
import { ErrorCode } from '../../errors/errorCodes';
import { prisma } from '../../services/db';
import { generateOpaqueToken, generatePkcePair } from '../../utils/crypto';
import type { RequestMeta } from './auth.service';
import {
  issueSessionTokens,
  signOAuthTransaction,
  verifyOAuthTransaction,
} from './token.service';

export type OAuthProvider = 'github' | 'google';

interface OAuthProfile {
  providerAccountId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  suggestedUsername: string | null;
}

function getCallbackUrl(provider: OAuthProvider): string {
  return `${env.API_URL}/api/v1/auth/oauth/${provider}/callback`;
}

function ensureProviderConfigured(provider: OAuthProvider): void {
  if (provider === 'github' && (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET)) {
    throw new ExternalServiceError(
      'GitHub OAuth is not configured on the server yet',
      ErrorCode.OAUTH_NOT_CONFIGURED,
    );
  }
  if (provider === 'google' && (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET)) {
    throw new ExternalServiceError(
      'Google OAuth is not configured on the server yet',
      ErrorCode.OAUTH_NOT_CONFIGURED,
    );
  }
}

export function sanitizeRedirectPath(redirectPath?: string): string {
  if (!redirectPath || !redirectPath.startsWith('/') || redirectPath.startsWith('//')) {
    return '/dashboard';
  }
  return redirectPath;
}

export async function createOAuthAuthorizationUrl(
  provider: OAuthProvider,
  redirectTo?: string,
): Promise<{ url: string; txCookieToken: string }> {
  ensureProviderConfigured(provider);

  const state = generateOpaqueToken(24);
  const safeRedirect = sanitizeRedirectPath(redirectTo);
  const callbackUrl = getCallbackUrl(provider);

  if (provider === 'github') {
    const txCookieToken = await signOAuthTransaction({
      state,
      provider,
      redirectTo: safeRedirect,
    });

    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: callbackUrl,
      scope: 'read:user user:email',
      state,
    });

    return {
      url: `https://github.com/login/oauth/authorize?${params.toString()}`,
      txCookieToken,
    };
  }

  const pkce = generatePkcePair();
  const txCookieToken = await signOAuthTransaction({
    state,
    provider,
    codeVerifier: pkce.verifier,
    redirectTo: safeRedirect,
  });

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: pkce.challenge,
    code_challenge_method: 'S256',
    access_type: 'online',
    prompt: 'select_account',
  });

  return {
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    txCookieToken,
  };
}

async function fetchGitHubProfile(code: string, redirectUri: string): Promise<OAuthProfile> {
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new ExternalServiceError(
      'Failed to exchange GitHub authorization code',
      ErrorCode.OAUTH_PROVIDER_ERROR,
    );
  }

  const headers = {
    Authorization: `Bearer ${tokenData.access_token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'StreamXT-Auth',
  };

  const [userRes, emailsRes] = await Promise.all([
    fetch('https://api.github.com/user', { headers }),
    fetch('https://api.github.com/user/emails', { headers }),
  ]);

  if (!userRes.ok) {
    throw new ExternalServiceError('Failed to fetch GitHub profile', ErrorCode.OAUTH_PROVIDER_ERROR);
  }

  const ghUser = (await userRes.json()) as {
    id: number;
    login?: string;
    name?: string | null;
    avatar_url?: string | null;
    email?: string | null;
  };

  let primaryEmail = ghUser.email ?? null;
  if (emailsRes.ok) {
    const emails = (await emailsRes.json()) as Array<{
      email: string;
      primary: boolean;
      verified: boolean;
    }>;
    const verifiedPrimary = emails.find((e) => e.primary && e.verified);
    const anyVerified = emails.find((e) => e.verified);
    primaryEmail = verifiedPrimary?.email ?? anyVerified?.email ?? primaryEmail;
  }

  if (!primaryEmail) {
    throw new BadRequestError(
      'Your GitHub account must have a verified email address',
      ErrorCode.OAUTH_PROVIDER_ERROR,
    );
  }

  return {
    providerAccountId: String(ghUser.id),
    email: primaryEmail.toLowerCase(),
    name: ghUser.name ?? ghUser.login ?? null,
    avatarUrl: ghUser.avatar_url ?? null,
    suggestedUsername: ghUser.login ? ghUser.login.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() : null,
  };
}

async function fetchGoogleProfile(
  code: string,
  redirectUri: string,
  codeVerifier?: string,
): Promise<OAuthProfile> {
  const body = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
  });

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new ExternalServiceError(
      'Failed to exchange Google authorization code',
      ErrorCode.OAUTH_PROVIDER_ERROR,
    );
  }

  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userRes.ok) {
    throw new ExternalServiceError('Failed to fetch Google profile', ErrorCode.OAUTH_PROVIDER_ERROR);
  }

  const gUser = (await userRes.json()) as {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };

  if (!gUser.email || gUser.email_verified === false) {
    throw new BadRequestError(
      'Your Google account must have a verified email address',
      ErrorCode.OAUTH_PROVIDER_ERROR,
    );
  }

  return {
    providerAccountId: gUser.sub,
    email: gUser.email.toLowerCase(),
    name: gUser.name ?? null,
    avatarUrl: gUser.picture ?? null,
    suggestedUsername: null,
  };
}

export async function handleOAuthCallback(params: {
  provider: OAuthProvider;
  code?: string;
  state?: string;
  txCookieToken?: string;
  meta: RequestMeta;
}): Promise<{ accessToken: string; refreshToken: string; redirectTo: string }> {
  ensureProviderConfigured(params.provider);

  if (!params.code || !params.state || !params.txCookieToken) {
    throw new UnauthorizedError('Invalid OAuth callback parameters', ErrorCode.INVALID_TOKEN);
  }

  const tx = await verifyOAuthTransaction(params.txCookieToken);
  if (tx.provider !== params.provider || tx.state !== params.state) {
    throw new UnauthorizedError('OAuth state mismatch', ErrorCode.INVALID_TOKEN);
  }

  const redirectUri = getCallbackUrl(params.provider);
  const profile =
    params.provider === 'github'
      ? await fetchGitHubProfile(params.code, redirectUri)
      : await fetchGoogleProfile(params.code, redirectUri, tx.codeVerifier);

  const existingOAuth = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: params.provider,
        providerAccountId: profile.providerAccountId,
      },
    },
    include: { user: true },
  });

  let user = existingOAuth?.user ?? null;

  if (!user) {
    const existingByEmail = await prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (existingByEmail) {
      user = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          emailVerifiedAt: existingByEmail.emailVerifiedAt ?? new Date(),
          avatarUrl: existingByEmail.avatarUrl ?? profile.avatarUrl,
          name: existingByEmail.name ?? profile.name,
        },
      });
    } else {
      let username: string | null = null;
      if (profile.suggestedUsername && profile.suggestedUsername.length >= 3) {
        const candidate = profile.suggestedUsername.slice(0, 24);
        const taken = await prisma.user.findUnique({ where: { username: candidate } });
        if (!taken) {
          username = candidate;
        }
      }

      user = await prisma.user.create({
        data: {
          email: profile.email,
          username,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
          emailVerifiedAt: new Date(),
        },
      });
    }

    await prisma.oAuthAccount.create({
      data: {
        userId: user.id,
        provider: params.provider,
        providerAccountId: profile.providerAccountId,
      },
    });
  }

  const tokens = await issueSessionTokens(user, params.meta);
  const finalRedirect = user.username ? tx.redirectTo : '/auth/complete-profile';

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    redirectTo: finalRedirect,
  };
}
