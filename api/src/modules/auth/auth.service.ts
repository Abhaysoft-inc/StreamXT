import bcrypt from 'bcryptjs';
import { env } from '../../config/env';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
} from '../../errors/AppError';
import { ErrorCode } from '../../errors/errorCodes';
import { prisma } from '../../services/db';
import { mailService } from '../../services/mail.service';
import { generateOtpCode, sha256 } from '../../utils/crypto';
import { sanitizeUser, type PublicUser } from '../../utils/response';
import {
  issueSessionTokens,
  revokeSessionByRefreshToken,
  rotateRefreshToken,
} from './token.service';

export interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

const OTP_EXPIRY_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;

async function createAndSendOtp(params: {
  email: string;
  userId?: string;
  purpose: 'signup_verify' | 'signin_otp';
}): Promise<{ resendAfterSeconds: number }> {
  const latest = await prisma.verificationCode.findFirst({
    where: {
      email: params.email,
      purpose: params.purpose,
      consumedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (latest) {
    const elapsedSeconds = Math.floor((Date.now() - latest.lastSentAt.getTime()) / 1000);
    if (elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
      const retryAfter = OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds;
      throw new TooManyRequestsError(
        `Please wait ${retryAfter}s before requesting another verification code.`,
        ErrorCode.OTP_COOLDOWN,
        { retryAfter },
      );
    }
  }

  // Invalidate prior active codes for the same email & purpose
  await prisma.verificationCode.updateMany({
    where: {
      email: params.email,
      purpose: params.purpose,
      consumedAt: null,
    },
    data: { consumedAt: new Date() },
  });

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.verificationCode.create({
    data: {
      email: params.email,
      userId: params.userId,
      purpose: params.purpose,
      codeHash: sha256(code),
      expiresAt,
      lastSentAt: new Date(),
    },
  });

  await mailService.sendOtpEmail({
    to: params.email,
    code,
    purpose: params.purpose,
  });

  return { resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS };
}

async function consumeOtp(params: {
  email: string;
  code: string;
  purpose: 'signup_verify' | 'signin_otp';
}): Promise<void> {
  const record = await prisma.verificationCode.findFirst({
    where: {
      email: params.email,
      purpose: params.purpose,
      consumedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    throw new BadRequestError(
      'No active verification code found. Please request a new one.',
      ErrorCode.OTP_INVALID,
      undefined,
      { code: ['No active verification code found'] },
    );
  }

  if (record.expiresAt <= new Date()) {
    throw new BadRequestError(
      'Verification code has expired. Please request a new one.',
      ErrorCode.OTP_EXPIRED,
      undefined,
      { code: ['Verification code has expired'] },
    );
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    throw new TooManyRequestsError(
      'Too many incorrect attempts. Please request a new verification code.',
      ErrorCode.OTP_MAX_ATTEMPTS,
    );
  }

  if (sha256(params.code) !== record.codeHash) {
    await prisma.verificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });

    throw new BadRequestError(
      'Incorrect verification code',
      ErrorCode.OTP_INVALID,
      undefined,
      { code: ['Incorrect verification code'] },
    );
  }

  await prisma.verificationCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });
}

export async function signup(
  input: { email: string; password: string; username: string; name?: string },
  meta: RequestMeta,
): Promise<
  | {
      requiresVerification: true;
      email: string;
      resendAfterSeconds: number;
    }
  | {
      requiresVerification: false;
      user: PublicUser;
      accessToken: string;
      refreshToken: string;
    }
> {
  const existingEmail = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingEmail && existingEmail.emailVerifiedAt) {
    throw new ConflictError(
      'An account with this email already exists',
      ErrorCode.EMAIL_ALREADY_EXISTS,
      { email: ['An account with this email already exists'] },
    );
  }

  const existingUsername = await prisma.user.findUnique({
    where: { username: input.username },
  });

  if (existingUsername && existingUsername.id !== existingEmail?.id) {
    throw new ConflictError(
      'That username is already taken',
      ErrorCode.USERNAME_TAKEN,
      { username: ['That username is already taken'] },
    );
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const now = new Date();

  const user = existingEmail
    ? await prisma.user.update({
        where: { id: existingEmail.id },
        data: {
          passwordHash,
          username: input.username,
          name: input.name ?? input.username,
          emailVerifiedAt: env.REQUIRE_EMAIL_VERIFICATION ? null : now,
        },
      })
    : await prisma.user.create({
        data: {
          email: input.email,
          username: input.username,
          name: input.name ?? input.username,
          passwordHash,
          emailVerifiedAt: env.REQUIRE_EMAIL_VERIFICATION ? null : now,
        },
      });

  if (env.REQUIRE_EMAIL_VERIFICATION) {
    const { resendAfterSeconds } = await createAndSendOtp({
      email: user.email,
      userId: user.id,
      purpose: 'signup_verify',
    });

    return {
      requiresVerification: true,
      email: user.email,
      resendAfterSeconds,
    };
  }

  const tokens = await issueSessionTokens(user, meta);
  return {
    requiresVerification: false,
    user: sanitizeUser(user),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

export async function verifySignupOtp(
  input: { email: string; code: string },
  meta: RequestMeta,
): Promise<{ user: PublicUser; accessToken: string; refreshToken: string }> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw new NotFoundError('No account found for this email');
  }

  await consumeOtp({
    email: input.email,
    code: input.code,
    purpose: 'signup_verify',
  });

  const verifiedUser = user.emailVerifiedAt
    ? user
    : await prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      });

  const tokens = await issueSessionTokens(verifiedUser, meta);
  return {
    user: sanitizeUser(verifiedUser),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

export async function resendOtp(input: {
  email: string;
  purpose: 'signup_verify' | 'signin_otp';
}): Promise<{ resendAfterSeconds: number }> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw new NotFoundError('No account found for this email');
  }

  return createAndSendOtp({
    email: user.email,
    userId: user.id,
    purpose: input.purpose,
  });
}

export async function identifySignIn(email: string): Promise<{
  email: string;
  strategies: Array<'password' | 'email_code'>;
}> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      emailVerifiedAt: true,
    },
  });

  if (!user) {
    throw new BadRequestError(
      'No account found with this email address',
      ErrorCode.NOT_FOUND,
      undefined,
      { email: ['No account found with this email address'] },
    );
  }

  if (env.REQUIRE_EMAIL_VERIFICATION && !user.emailVerifiedAt) {
    throw new ForbiddenError(
      'Please verify your email address before signing in',
      ErrorCode.EMAIL_NOT_VERIFIED,
    );
  }

  const strategies: Array<'password' | 'email_code'> = [];
  if (user.passwordHash) {
    strategies.push('password');
  }
  strategies.push('email_code');

  return {
    email: user.email,
    strategies,
  };
}

export async function signInWithPassword(
  input: { email: string; password: string },
  meta: RequestMeta,
): Promise<{ user: PublicUser; accessToken: string; refreshToken: string }> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user || !user.passwordHash) {
    throw new UnauthorizedError(
      'Invalid email or password',
      ErrorCode.INVALID_CREDENTIALS,
      undefined,
      { password: ['Invalid email or password'] },
    );
  }

  const matches = await bcrypt.compare(input.password, user.passwordHash);
  if (!matches) {
    throw new UnauthorizedError(
      'Invalid email or password',
      ErrorCode.INVALID_CREDENTIALS,
      undefined,
      { password: ['Invalid email or password'] },
    );
  }

  if (env.REQUIRE_EMAIL_VERIFICATION && !user.emailVerifiedAt) {
    throw new ForbiddenError(
      'Please verify your email address before signing in',
      ErrorCode.EMAIL_NOT_VERIFIED,
    );
  }

  const tokens = await issueSessionTokens(user, meta);
  return {
    user: sanitizeUser(user),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

export async function sendSignInOtp(email: string): Promise<{ resendAfterSeconds: number }> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new BadRequestError(
      'No account found with this email address',
      ErrorCode.NOT_FOUND,
      undefined,
      { email: ['No account found with this email address'] },
    );
  }

  if (env.REQUIRE_EMAIL_VERIFICATION && !user.emailVerifiedAt) {
    throw new ForbiddenError(
      'Please verify your email address before signing in',
      ErrorCode.EMAIL_NOT_VERIFIED,
    );
  }

  return createAndSendOtp({
    email: user.email,
    userId: user.id,
    purpose: 'signin_otp',
  });
}

export async function verifySignInOtp(
  input: { email: string; code: string },
  meta: RequestMeta,
): Promise<{ user: PublicUser; accessToken: string; refreshToken: string }> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw new NotFoundError('No account found for this email');
  }

  await consumeOtp({
    email: input.email,
    code: input.code,
    purpose: 'signin_otp',
  });

  const tokens = await issueSessionTokens(user, meta);
  return {
    user: sanitizeUser(user),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

export async function completeProfile(
  userId: string,
  input: { username: string; name?: string },
): Promise<PublicUser> {
  const existingUsername = await prisma.user.findUnique({
    where: { username: input.username },
  });

  if (existingUsername && existingUsername.id !== userId) {
    throw new ConflictError(
      'That username is already taken',
      ErrorCode.USERNAME_TAKEN,
      { username: ['That username is already taken'] },
    );
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      username: input.username,
      ...(input.name ? { name: input.name } : {}),
    },
  });

  return sanitizeUser(updated);
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new UnauthorizedError('User account no longer exists', ErrorCode.UNAUTHORIZED);
  }

  return sanitizeUser(user);
}

export async function refreshSession(
  refreshToken: string | undefined,
  meta: RequestMeta,
): Promise<{ user: PublicUser; accessToken: string; refreshToken: string }> {
  if (!refreshToken) {
    throw new UnauthorizedError('Refresh token missing', ErrorCode.UNAUTHORIZED);
  }

  const result = await rotateRefreshToken(refreshToken, meta);
  return {
    user: sanitizeUser(result.user),
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  };
}

export async function signOut(refreshToken: string | undefined): Promise<void> {
  await revokeSessionByRefreshToken(refreshToken);
}
