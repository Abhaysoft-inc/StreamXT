import { SignJWT, jwtVerify } from 'jose';
import { env } from '../../config/env';
import {
  BadRequestError,
  ExternalServiceError,
  UnauthorizedError,
} from '../../errors/AppError';
import { ErrorCode } from '../../errors/errorCodes';
import { prisma } from '../../services/db';
import { generateOpaqueToken, generatePkcePair } from '../../utils/crypto';
import { sanitizeRedirectPath } from '../auth/oauth.service';

const oauthStateSecret = new TextEncoder().encode(env.OAUTH_STATE_SECRET);
export const YOUTUBE_OAUTH_COOKIE_NAME = 'streamxt_yt_oauth_tx';

interface YouTubeOAuthState {
  state: string;
  userId: string;
  codeVerifier: string;
  redirectTo: string;
}

export interface YouTubeStreamItem {
  id: string;
  title: string;
  streamKey: string;
  ingestionAddress: string;
  resolution: string | null;
  frameRate: string | null;
  status: string | null;
}

function getYouTubeCallbackUrl(): string {
  return `${env.API_URL}/api/v1/youtube/oauth/callback`;
}

function ensureGoogleConfigured(): void {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new ExternalServiceError(
      'Google OAuth is not configured on the server yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to api/.env.',
      ErrorCode.OAUTH_NOT_CONFIGURED,
    );
  }
}

async function signYouTubeTx(payload: YouTubeOAuthState): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(oauthStateSecret);
}

async function verifyYouTubeTx(token: string): Promise<YouTubeOAuthState> {
  const { payload } = await jwtVerify(token, oauthStateSecret, {
    algorithms: ['HS256'],
  });

  if (
    typeof payload.state !== 'string' ||
    typeof payload.userId !== 'string' ||
    typeof payload.codeVerifier !== 'string' ||
    typeof payload.redirectTo !== 'string'
  ) {
    throw new UnauthorizedError('Invalid YouTube OAuth state', ErrorCode.INVALID_TOKEN);
  }

  return {
    state: payload.state,
    userId: payload.userId,
    codeVerifier: payload.codeVerifier,
    redirectTo: payload.redirectTo,
  };
}

export async function createYouTubeAuthUrl(
  userId: string,
  redirectTo?: string,
): Promise<{ url: string; txToken: string }> {
  ensureGoogleConfigured();

  const state = generateOpaqueToken(24);
  const pkce = generatePkcePair();
  const safeRedirect = sanitizeRedirectPath(redirectTo || '/dashboard?yt_modal=1');

  const txToken = await signYouTubeTx({
    state,
    userId,
    codeVerifier: pkce.verifier,
    redirectTo: safeRedirect,
  });

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: getYouTubeCallbackUrl(),
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube',
    ].join(' '),
    state,
    code_challenge: pkce.challenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
  });

  return {
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    txToken,
  };
}

export async function handleYouTubeCallback(params: {
  code?: string;
  state?: string;
  txToken?: string;
}): Promise<{ redirectTo: string }> {
  ensureGoogleConfigured();

  if (!params.code || !params.state || !params.txToken) {
    throw new UnauthorizedError('Invalid YouTube OAuth callback parameters', ErrorCode.INVALID_TOKEN);
  }

  const tx = await verifyYouTubeTx(params.txToken);
  if (tx.state !== params.state) {
    throw new UnauthorizedError('YouTube OAuth state mismatch', ErrorCode.INVALID_TOKEN);
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code: params.code,
      redirect_uri: getYouTubeCallbackUrl(),
      grant_type: 'authorization_code',
      code_verifier: tx.codeVerifier,
    }).toString(),
  });

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error_description?: string;
  };

  if (!tokenRes.ok || !tokenData.access_token) {
    throw new ExternalServiceError(
      tokenData.error_description || 'Failed to exchange Google code for YouTube access',
      ErrorCode.OAUTH_PROVIDER_ERROR,
    );
  }

  const channelRes = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
    {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    },
  );

  let channelId: string | null = null;
  let channelTitle: string | null = null;
  let channelThumbnail: string | null = null;

  if (channelRes.ok) {
    const channelData = (await channelRes.json()) as {
      items?: Array<{
        id: string;
        snippet?: {
          title?: string;
          thumbnails?: { default?: { url?: string }; medium?: { url?: string } };
        };
      }>;
    };
    const first = channelData.items?.[0];
    if (first) {
      channelId = first.id;
      channelTitle = first.snippet?.title ?? null;
      channelThumbnail =
        first.snippet?.thumbnails?.medium?.url ??
        first.snippet?.thumbnails?.default?.url ??
        null;
    }
  }

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : null;

  const existing = await prisma.youTubeConnection.findUnique({
    where: { userId: tx.userId },
    select: { refreshToken: true },
  });

  await prisma.youTubeConnection.upsert({
    where: { userId: tx.userId },
    update: {
      channelId,
      channelTitle,
      channelThumbnail,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? existing?.refreshToken ?? null,
      expiresAt,
    },
    create: {
      userId: tx.userId,
      channelId,
      channelTitle,
      channelThumbnail,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      expiresAt,
    },
  });

  return { redirectTo: tx.redirectTo };
}

async function getValidAccessToken(userId: string): Promise<string> {
  const connection = await prisma.youTubeConnection.findUnique({
    where: { userId },
  });

  if (!connection) {
    throw new UnauthorizedError(
      'YouTube account is not connected. Please connect with Google first.',
      ErrorCode.UNAUTHORIZED,
    );
  }

  const isExpired =
    connection.expiresAt && connection.expiresAt.getTime() <= Date.now() + 60 * 1000;

  if (!isExpired) {
    return connection.accessToken;
  }

  if (!connection.refreshToken) {
    throw new UnauthorizedError(
      'Google session expired. Please reconnect your YouTube account.',
      ErrorCode.TOKEN_EXPIRED,
    );
  }

  ensureGoogleConfigured();

  const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: connection.refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });

  const refreshData = (await refreshRes.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!refreshRes.ok || !refreshData.access_token) {
    throw new UnauthorizedError(
      'Failed to refresh Google access. Please reconnect your YouTube account.',
      ErrorCode.TOKEN_EXPIRED,
    );
  }

  await prisma.youTubeConnection.update({
    where: { userId },
    data: {
      accessToken: refreshData.access_token,
      expiresAt: refreshData.expires_in
        ? new Date(Date.now() + refreshData.expires_in * 1000)
        : null,
    },
  });

  return refreshData.access_token;
}

export async function getConnectionStatus(userId: string): Promise<{
  connected: boolean;
  googleConfigured: boolean;
  channel: { id: string | null; title: string | null; thumbnail: string | null } | null;
}> {
  const connection = await prisma.youTubeConnection.findUnique({
    where: { userId },
    select: {
      channelId: true,
      channelTitle: true,
      channelThumbnail: true,
    },
  });

  return {
    connected: Boolean(connection),
    googleConfigured: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    channel: connection
      ? {
          id: connection.channelId,
          title: connection.channelTitle,
          thumbnail: connection.channelThumbnail,
        }
      : null,
  };
}

export async function disconnectYouTube(userId: string): Promise<void> {
  await prisma.youTubeConnection.deleteMany({
    where: { userId },
  });
}

function mapYouTubeStream(item: {
  id: string;
  snippet?: { title?: string };
  cdn?: {
    resolution?: string;
    frameRate?: string;
    ingestionInfo?: { streamName?: string; ingestionAddress?: string };
  };
  status?: { streamStatus?: string };
}): YouTubeStreamItem | null {
  const streamKey = item.cdn?.ingestionInfo?.streamName;
  if (!streamKey) return null;

  return {
    id: item.id,
    title: item.snippet?.title ?? 'Untitled YouTube Stream',
    streamKey,
    ingestionAddress: item.cdn?.ingestionInfo?.ingestionAddress ?? 'rtmp://a.rtmp.youtube.com/live2',
    resolution: item.cdn?.resolution ?? null,
    frameRate: item.cdn?.frameRate ?? null,
    status: item.status?.streamStatus ?? null,
  };
}

export async function listLiveStreams(userId: string): Promise<YouTubeStreamItem[]> {
  const accessToken = await getValidAccessToken(userId);

  const res = await fetch(
    'https://www.googleapis.com/youtube/v3/liveStreams?part=snippet,cdn,status&mine=true&maxResults=25',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  const data = (await res.json()) as {
    items?: Array<Parameters<typeof mapYouTubeStream>[0]>;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new ExternalServiceError(
      data.error?.message || 'Failed to fetch YouTube live streams',
      ErrorCode.OAUTH_PROVIDER_ERROR,
    );
  }

  return (data.items ?? [])
    .map(mapYouTubeStream)
    .filter((item): item is YouTubeStreamItem => item !== null);
}

export async function createLiveStream(
  userId: string,
  title: string,
): Promise<YouTubeStreamItem> {
  const accessToken = await getValidAccessToken(userId);

  const res = await fetch(
    'https://www.googleapis.com/youtube/v3/liveStreams?part=snippet,cdn,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: { title },
        cdn: {
          frameRate: 'variable',
          ingestionType: 'rtmp',
          resolution: 'variable',
        },
      }),
    },
  );

  const data = (await res.json()) as Parameters<typeof mapYouTubeStream>[0] & {
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new ExternalServiceError(
      data.error?.message || 'Failed to create YouTube live stream key',
      ErrorCode.OAUTH_PROVIDER_ERROR,
    );
  }

  const mapped = mapYouTubeStream(data);
  if (!mapped) {
    throw new BadRequestError('YouTube did not return a stream key for this stream');
  }

  return mapped;
}

export interface YouTubePastBroadcast {
  id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  publishedAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  watchUrl: string;
  privacyStatus: string | null;
  viewCount: number | null;
  likeCount: number | null;
  duration: string | null;
}

export async function listPastBroadcasts(userId: string): Promise<{
  connected: boolean;
  channel: { id: string | null; title: string | null; thumbnail: string | null } | null;
  broadcasts: YouTubePastBroadcast[];
}> {
  const connection = await prisma.youTubeConnection.findUnique({
    where: { userId },
    select: {
      channelId: true,
      channelTitle: true,
      channelThumbnail: true,
    },
  });

  if (!connection) {
    return {
      connected: false,
      channel: null,
      broadcasts: [],
    };
  }

  const accessToken = await getValidAccessToken(userId);

  const broadcastsRes = await fetch(
    'https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,contentDetails,status&broadcastStatus=completed&broadcastType=all&maxResults=12',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  const broadcastsData = (await broadcastsRes.json()) as {
    items?: Array<{
      id: string;
      snippet?: {
        title?: string;
        description?: string;
        publishedAt?: string;
        actualStartTime?: string;
        actualEndTime?: string;
        thumbnails?: {
          maxres?: { url?: string };
          high?: { url?: string };
          medium?: { url?: string };
          default?: { url?: string };
        };
      };
      status?: {
        privacyStatus?: string;
      };
    }>;
    error?: { message?: string };
  };

  if (!broadcastsRes.ok) {
    throw new ExternalServiceError(
      broadcastsData.error?.message || 'Failed to fetch past YouTube streams',
      ErrorCode.OAUTH_PROVIDER_ERROR,
    );
  }

  const items = broadcastsData.items ?? [];
  const statsById = new Map<
    string,
    { viewCount: number | null; likeCount: number | null; duration: string | null }
  >();

  if (items.length > 0) {
    const ids = items.map((item) => item.id).join(',');
    const videosRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${encodeURIComponent(ids)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (videosRes.ok) {
      const videosData = (await videosRes.json()) as {
        items?: Array<{
          id: string;
          statistics?: { viewCount?: string; likeCount?: string };
          contentDetails?: { duration?: string };
        }>;
      };

      for (const vid of videosData.items ?? []) {
        statsById.set(vid.id, {
          viewCount: vid.statistics?.viewCount ? Number(vid.statistics.viewCount) : null,
          likeCount: vid.statistics?.likeCount ? Number(vid.statistics.likeCount) : null,
          duration: vid.contentDetails?.duration ?? null,
        });
      }
    }
  }

  const broadcasts: YouTubePastBroadcast[] = items
    .map((item) => {
      const thumbs = item.snippet?.thumbnails;
      const stats = statsById.get(item.id);
      return {
        id: item.id,
        title: item.snippet?.title ?? 'Untitled Stream',
        description: item.snippet?.description ?? '',
        thumbnail:
          thumbs?.high?.url ??
          thumbs?.medium?.url ??
          thumbs?.maxres?.url ??
          thumbs?.default?.url ??
          null,
        publishedAt: item.snippet?.publishedAt ?? null,
        startedAt: item.snippet?.actualStartTime ?? null,
        endedAt: item.snippet?.actualEndTime ?? null,
        watchUrl: `https://www.youtube.com/watch?v=${item.id}`,
        privacyStatus: item.status?.privacyStatus ?? null,
        viewCount: stats?.viewCount ?? null,
        likeCount: stats?.likeCount ?? null,
        duration: stats?.duration ?? null,
      };
    })
    .sort((a, b) => {
      const timeA = Date.parse(a.endedAt || a.publishedAt || '') || 0;
      const timeB = Date.parse(b.endedAt || b.publishedAt || '') || 0;
      return timeB - timeA;
    });

  return {
    connected: true,
    channel: {
      id: connection.channelId,
      title: connection.channelTitle,
      thumbnail: connection.channelThumbnail,
    },
    broadcasts,
  };
}

export async function prepareBroadcastForStream(
  userId: string,
  input: {
    streamId: string;
    title: string;
    description?: string;
    privacyStatus: 'public' | 'unlisted' | 'private';
  },
): Promise<{
  broadcastId: string;
  streamId: string;
  title: string;
  privacyStatus: 'public' | 'unlisted' | 'private';
  watchUrl: string;
}> {
  const accessToken = await getValidAccessToken(userId);

  const insertRes = await fetch(
    'https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,status,contentDetails',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          title: input.title,
          description: input.description ?? '',
          scheduledStartTime: new Date().toISOString(),
        },
        status: {
          privacyStatus: input.privacyStatus,
          selfDeclaredMadeForKids: false,
        },
        contentDetails: {
          enableAutoStart: true,
          enableAutoStop: true,
        },
      }),
    },
  );

  const broadcastData = (await insertRes.json()) as {
    id?: string;
    error?: { message?: string };
  };

  if (!insertRes.ok || !broadcastData.id) {
    throw new ExternalServiceError(
      broadcastData.error?.message || 'Failed to create YouTube broadcast',
      ErrorCode.OAUTH_PROVIDER_ERROR,
    );
  }

  const bindRes = await fetch(
    `https://www.googleapis.com/youtube/v3/liveBroadcasts/bind?id=${encodeURIComponent(
      broadcastData.id,
    )}&part=id,snippet,contentDetails,status&streamId=${encodeURIComponent(input.streamId)}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  const bindData = (await bindRes.json()) as { error?: { message?: string } };
  if (!bindRes.ok) {
    throw new ExternalServiceError(
      bindData.error?.message || 'Created broadcast but failed to bind stream key',
      ErrorCode.OAUTH_PROVIDER_ERROR,
    );
  }

  return {
    broadcastId: broadcastData.id,
    streamId: input.streamId,
    title: input.title,
    privacyStatus: input.privacyStatus,
    watchUrl: `https://www.youtube.com/watch?v=${broadcastData.id}`,
  };
}

export interface YouTubeLiveChatMessage {
  id: string;
  author: string;
  avatarUrl: string | null;
  text: string;
  publishedAt: string;
  isOwner: boolean;
  isModerator: boolean;
  source: 'youtube';
}

export interface YouTubePollData {
  id: string;
  question: string;
  status: 'active' | 'closed';
  options: Array<{ id: string; label: string; votes: number }>;
  source: 'youtube';
}

export async function resolveLiveChatSession(
  userId: string,
  broadcastId?: string,
): Promise<{
  connected: boolean;
  broadcastId: string | null;
  liveChatId: string | null;
}> {
  const connection = await prisma.youTubeConnection.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!connection) {
    return { connected: false, broadcastId: null, liveChatId: null };
  }

  const accessToken = await getValidAccessToken(userId);
  const url = broadcastId
    ? `https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,status&id=${encodeURIComponent(broadcastId)}`
    : 'https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,status&broadcastStatus=active&broadcastType=all&maxResults=5';

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    return { connected: true, broadcastId: broadcastId ?? null, liveChatId: null };
  }

  const data = (await res.json()) as {
    items?: Array<{ id: string; snippet?: { liveChatId?: string } }>;
  };

  const first = data.items?.[0];
  return {
    connected: true,
    broadcastId: first?.id ?? broadcastId ?? null,
    liveChatId: first?.snippet?.liveChatId ?? null,
  };
}

export async function getLiveChatMessages(
  userId: string,
  params: { liveChatId: string; pageToken?: string },
): Promise<{
  messages: YouTubeLiveChatMessage[];
  pollUpdate: YouTubePollData | null;
  nextPageToken: string | null;
  pollingIntervalMillis: number;
}> {
  const accessToken = await getValidAccessToken(userId);
  const query = new URLSearchParams({
    liveChatId: params.liveChatId,
    part: 'id,snippet,authorDetails',
    maxResults: '50',
    ...(params.pageToken ? { pageToken: params.pageToken } : {}),
  });

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/liveChat/messages?${query.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  const data = (await res.json()) as {
    items?: Array<{
      id: string;
      snippet?: {
        type?: string;
        publishedAt?: string;
        displayMessage?: string;
        pollDetails?: {
          status?: string;
          metadata?: {
            questionText?: string;
            options?: Array<{ optionText?: string; tally?: string }>;
          };
        };
      };
      authorDetails?: {
        displayName?: string;
        profileImageUrl?: string;
        isChatOwner?: boolean;
        isChatModerator?: boolean;
      };
    }>;
    nextPageToken?: string;
    pollingIntervalMillis?: number;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new ExternalServiceError(
      data.error?.message || 'Failed to load YouTube live chat messages',
      ErrorCode.OAUTH_PROVIDER_ERROR,
    );
  }

  const messages: YouTubeLiveChatMessage[] = [];
  let pollUpdate: YouTubePollData | null = null;

  for (const item of data.items ?? []) {
    const type = item.snippet?.type;
    if (type === 'pollEvent' && item.snippet?.pollDetails?.metadata) {
      const meta = item.snippet.pollDetails.metadata;
      pollUpdate = {
        id: item.id,
        question: meta.questionText ?? 'Live Poll',
        status: item.snippet.pollDetails.status === 'closed' ? 'closed' : 'active',
        options: (meta.options ?? []).map((opt, idx) => ({
          id: `${item.id}-opt-${idx}`,
          label: opt.optionText ?? `Option ${idx + 1}`,
          votes: Number(opt.tally || 0),
        })),
        source: 'youtube',
      };
      continue;
    }

    if (item.snippet?.displayMessage) {
      messages.push({
        id: item.id,
        author: item.authorDetails?.displayName ?? 'Viewer',
        avatarUrl: item.authorDetails?.profileImageUrl ?? null,
        text: item.snippet.displayMessage,
        publishedAt: item.snippet.publishedAt ?? new Date().toISOString(),
        isOwner: Boolean(item.authorDetails?.isChatOwner),
        isModerator: Boolean(item.authorDetails?.isChatModerator),
        source: 'youtube',
      });
    }
  }

  return {
    messages,
    pollUpdate,
    nextPageToken: data.nextPageToken ?? null,
    pollingIntervalMillis: Math.max(4000, Math.min(15000, data.pollingIntervalMillis ?? 5000)),
  };
}

export async function sendLiveChatMessage(
  userId: string,
  input: { liveChatId: string; message: string },
): Promise<YouTubeLiveChatMessage> {
  const accessToken = await getValidAccessToken(userId);

  const res = await fetch(
    'https://www.googleapis.com/youtube/v3/liveChat/messages?part=snippet,authorDetails',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          liveChatId: input.liveChatId,
          type: 'textMessageEvent',
          textMessageDetails: {
            messageText: input.message,
          },
        },
      }),
    },
  );

  const data = (await res.json()) as {
    id?: string;
    snippet?: { displayMessage?: string; publishedAt?: string };
    authorDetails?: { displayName?: string; profileImageUrl?: string };
    error?: { message?: string };
  };

  if (!res.ok || !data.id) {
    throw new ExternalServiceError(
      data.error?.message || 'Failed to send YouTube live chat message',
      ErrorCode.OAUTH_PROVIDER_ERROR,
    );
  }

  return {
    id: data.id,
    author: data.authorDetails?.displayName ?? 'Host',
    avatarUrl: data.authorDetails?.profileImageUrl ?? null,
    text: data.snippet?.displayMessage ?? input.message,
    publishedAt: data.snippet?.publishedAt ?? new Date().toISOString(),
    isOwner: true,
    isModerator: false,
    source: 'youtube',
  };
}

export async function createYouTubePoll(
  userId: string,
  input: { liveChatId: string; question: string; options: string[] },
): Promise<YouTubePollData> {
  const accessToken = await getValidAccessToken(userId);

  const res = await fetch(
    'https://www.googleapis.com/youtube/v3/liveChat/messages?part=snippet',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          liveChatId: input.liveChatId,
          type: 'pollEvent',
          pollDetails: {
            metadata: {
              questionText: input.question,
              options: input.options.map((optionText) => ({ optionText })),
            },
          },
        },
      }),
    },
  );

  const data = (await res.json()) as {
    id?: string;
    snippet?: {
      pollDetails?: {
        status?: string;
        metadata?: {
          questionText?: string;
          options?: Array<{ optionText?: string; tally?: string }>;
        };
      };
    };
    error?: { message?: string };
  };

  if (!res.ok || !data.id) {
    throw new ExternalServiceError(
      data.error?.message || 'Failed to launch YouTube live poll (stream must be live)',
      ErrorCode.OAUTH_PROVIDER_ERROR,
    );
  }

  const meta = data.snippet?.pollDetails?.metadata;
  const fallbackOptions: Array<{ optionText?: string; tally?: string }> = input.options.map((o) => ({
    optionText: o,
  }));
  const pollOptions = meta?.options ?? fallbackOptions;
  return {
    id: data.id,
    question: meta?.questionText ?? input.question,
    status: data.snippet?.pollDetails?.status === 'closed' ? 'closed' : 'active',
    options: pollOptions.map((opt, idx) => ({
      id: `${data.id}-opt-${idx}`,
      label: opt.optionText ?? input.options[idx] ?? `Option ${idx + 1}`,
      votes: Number(opt.tally || 0),
    })),
    source: 'youtube',
  };
}

export async function closeYouTubePoll(userId: string, pollId: string): Promise<void> {
  const accessToken = await getValidAccessToken(userId);

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/liveChat/messages/transition?id=${encodeURIComponent(
      pollId,
    )}&status=closed`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new ExternalServiceError(
      data.error?.message || 'Failed to close YouTube poll',
      ErrorCode.OAUTH_PROVIDER_ERROR,
    );
  }
}
