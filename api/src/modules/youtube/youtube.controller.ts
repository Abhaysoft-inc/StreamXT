import type { Request, Response } from 'express';
import { env } from '../../config/env';
import { UnauthorizedError } from '../../errors/AppError';
import { ErrorCode } from '../../errors/errorCodes';
import { sendSuccess } from '../../utils/response';
import * as youtubeService from './youtube.service';

const isProd = env.NODE_ENV === 'production';

export async function startOAuth(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    throw new UnauthorizedError('Authentication required', ErrorCode.UNAUTHORIZED);
  }

  const redirectTo =
    typeof req.query.redirect === 'string' ? req.query.redirect : '/dashboard?yt_modal=1';

  try {
    const { url, txToken } = await youtubeService.createYouTubeAuthUrl(req.auth.sub, redirectTo);
    res.cookie(youtubeService.YOUTUBE_OAUTH_COOKIE_NAME, txToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60 * 1000,
    });
    res.redirect(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to start Google OAuth';
    res.redirect(
      `${env.CLIENT_URL}/dashboard?yt_modal=1&yt_error=${encodeURIComponent(message)}`,
    );
  }
}

export async function oauthCallback(req: Request, res: Response): Promise<void> {
  const code = typeof req.query.code === 'string' ? req.query.code : undefined;
  const state = typeof req.query.state === 'string' ? req.query.state : undefined;
  const oauthError = typeof req.query.error === 'string' ? req.query.error : undefined;
  const txToken = req.cookies?.[youtubeService.YOUTUBE_OAUTH_COOKIE_NAME] as string | undefined;

  res.clearCookie(youtubeService.YOUTUBE_OAUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });

  if (oauthError) {
    res.redirect(
      `${env.CLIENT_URL}/dashboard?yt_modal=1&yt_error=${encodeURIComponent('Google authorization was cancelled')}`,
    );
    return;
  }

  try {
    const result = await youtubeService.handleYouTubeCallback({ code, state, txToken });
    const separator = result.redirectTo.includes('?') ? '&' : '?';
    res.redirect(`${env.CLIENT_URL}${result.redirectTo}${separator}yt_connected=1`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to connect YouTube account';
    res.redirect(
      `${env.CLIENT_URL}/dashboard?yt_modal=1&yt_error=${encodeURIComponent(message)}`,
    );
  }
}

export async function getConnection(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    throw new UnauthorizedError('Authentication required', ErrorCode.UNAUTHORIZED);
  }
  const status = await youtubeService.getConnectionStatus(req.auth.sub);
  sendSuccess(res, status);
}

export async function disconnect(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    throw new UnauthorizedError('Authentication required', ErrorCode.UNAUTHORIZED);
  }
  await youtubeService.disconnectYouTube(req.auth.sub);
  sendSuccess(res, { disconnected: true });
}

export async function listStreams(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    throw new UnauthorizedError('Authentication required', ErrorCode.UNAUTHORIZED);
  }
  const streams = await youtubeService.listLiveStreams(req.auth.sub);
  sendSuccess(res, { streams });
}

export async function createStream(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    throw new UnauthorizedError('Authentication required', ErrorCode.UNAUTHORIZED);
  }
  const stream = await youtubeService.createLiveStream(req.auth.sub, req.body.title);
  sendSuccess(res, { stream }, 201);
}

export async function listHistory(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    throw new UnauthorizedError('Authentication required', ErrorCode.UNAUTHORIZED);
  }
  const history = await youtubeService.listPastBroadcasts(req.auth.sub);
  sendSuccess(res, history);
}

export async function prepareBroadcast(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    throw new UnauthorizedError('Authentication required', ErrorCode.UNAUTHORIZED);
  }
  const broadcast = await youtubeService.prepareBroadcastForStream(req.auth.sub, req.body);
  sendSuccess(res, { broadcast }, 201);
}

export async function getChatSession(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    throw new UnauthorizedError('Authentication required', ErrorCode.UNAUTHORIZED);
  }
  const broadcastId =
    typeof req.query.broadcastId === 'string' ? req.query.broadcastId : undefined;
  const session = await youtubeService.resolveLiveChatSession(req.auth.sub, broadcastId);
  sendSuccess(res, session);
}

export async function getChatMessages(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    throw new UnauthorizedError('Authentication required', ErrorCode.UNAUTHORIZED);
  }
  const liveChatId = typeof req.query.liveChatId === 'string' ? req.query.liveChatId : '';
  const pageToken = typeof req.query.pageToken === 'string' ? req.query.pageToken : undefined;
  const result = await youtubeService.getLiveChatMessages(req.auth.sub, {
    liveChatId,
    pageToken,
  });
  sendSuccess(res, result);
}

export async function postChatMessage(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    throw new UnauthorizedError('Authentication required', ErrorCode.UNAUTHORIZED);
  }
  const message = await youtubeService.sendLiveChatMessage(req.auth.sub, req.body);
  sendSuccess(res, { message }, 201);
}

export async function createPoll(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    throw new UnauthorizedError('Authentication required', ErrorCode.UNAUTHORIZED);
  }
  const poll = await youtubeService.createYouTubePoll(req.auth.sub, req.body);
  sendSuccess(res, { poll }, 201);
}

export async function closePoll(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    throw new UnauthorizedError('Authentication required', ErrorCode.UNAUTHORIZED);
  }
  const pollId = String(req.params.pollId || '');
  await youtubeService.closeYouTubePoll(req.auth.sub, pollId);
  sendSuccess(res, { closed: true });
}
