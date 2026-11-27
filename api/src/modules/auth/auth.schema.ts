import { z } from 'zod';

const emailSchema = z
  .string({ required_error: 'Email address is required' })
  .trim()
  .min(1, 'Email address is required')
  .email('Please enter a valid email address')
  .transform((val) => val.toLowerCase());

const usernameSchema = z
  .string({ required_error: 'Username is required' })
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(24, 'Username must be at most 24 characters')
  .regex(
    /^[a-zA-Z0-9_]+$/,
    'Username may only contain letters, numbers, and underscores',
  )
  .transform((val) => val.toLowerCase());

const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');

const otpCodeSchema = z
  .string({ required_error: 'Verification code is required' })
  .trim()
  .regex(/^\d{6}$/, 'Verification code must be 6 digits');

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  name: z.string().trim().min(1).max(80).optional(),
});

export const verifySignupSchema = z.object({
  email: emailSchema,
  code: otpCodeSchema,
});

export const resendOtpSchema = z.object({
  email: emailSchema,
  purpose: z.enum(['signup_verify', 'signin_otp']),
});

export const identifySignInSchema = z.object({
  email: emailSchema,
});

export const passwordSignInSchema = z.object({
  email: emailSchema,
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

export const sendSignInOtpSchema = z.object({
  email: emailSchema,
});

export const verifySignInOtpSchema = z.object({
  email: emailSchema,
  code: otpCodeSchema,
});

export const completeProfileSchema = z.object({
  username: usernameSchema,
  name: z.string().trim().min(1).max(80).optional(),
});

export const oauthProviderParamsSchema = z.object({
  provider: z.enum(['github', 'google']),
});
