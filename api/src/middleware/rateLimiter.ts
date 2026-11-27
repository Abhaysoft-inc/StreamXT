import rateLimit from 'express-rate-limit';
import { ErrorCode } from '../errors/errorCodes';

function buildLimiterHandler(message: string) {
  return (_req: unknown, res: { status: (code: number) => { json: (body: unknown) => void } }) => {
    res.status(429).json({
      success: false,
      error: {
        code: ErrorCode.RATE_LIMITED,
        message,
      },
    });
  };
}

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: buildLimiterHandler('Too many auth requests. Please try again in a few minutes.'),
});

export const otpRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: buildLimiterHandler('Too many verification attempts. Please try again later.'),
});
