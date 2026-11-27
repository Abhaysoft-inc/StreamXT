import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { authRouter } from './modules/auth/auth.routes';
import { streamsRouter } from './modules/streams/streams.routes';
import { youtubeRouter } from './modules/youtube/youtube.routes';
import { sendSuccess } from './utils/response';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/api/v1/health', (_req, res) => {
    sendSuccess(res, {
      status: 'ok',
      service: 'streamxt-api',
      emailVerificationRequired: env.REQUIRE_EMAIL_VERIFICATION,
    });
  });

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/youtube', youtubeRouter);
  app.use('/api/v1/streams', streamsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
