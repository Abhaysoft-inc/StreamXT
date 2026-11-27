import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { authenticate } from '../../middleware/authenticate';
import { authRateLimiter, otpRateLimiter } from '../../middleware/rateLimiter';
import { validate } from '../../middleware/validate';
import * as authController from './auth.controller';
import {
  completeProfileSchema,
  identifySignInSchema,
  oauthProviderParamsSchema,
  passwordSignInSchema,
  resendOtpSchema,
  sendSignInOtpSchema,
  signupSchema,
  verifySignInOtpSchema,
  verifySignupSchema,
} from './auth.schema';

const router = Router();

router.use(authRateLimiter);

router.post('/signup', validate({ body: signupSchema }), asyncHandler(authController.signup));

router.post(
  '/signup/verify',
  otpRateLimiter,
  validate({ body: verifySignupSchema }),
  asyncHandler(authController.verifySignupOtp),
);

router.post(
  '/otp/resend',
  otpRateLimiter,
  validate({ body: resendOtpSchema }),
  asyncHandler(authController.resendOtp),
);

router.post(
  '/signin/identify',
  validate({ body: identifySignInSchema }),
  asyncHandler(authController.identifySignIn),
);

router.post(
  '/signin/password',
  otpRateLimiter,
  validate({ body: passwordSignInSchema }),
  asyncHandler(authController.signInWithPassword),
);

router.post(
  '/signin/otp/send',
  otpRateLimiter,
  validate({ body: sendSignInOtpSchema }),
  asyncHandler(authController.sendSignInOtp),
);

router.post(
  '/signin/otp/verify',
  otpRateLimiter,
  validate({ body: verifySignInOtpSchema }),
  asyncHandler(authController.verifySignInOtp),
);

router.post('/refresh', asyncHandler(authController.refresh));
router.get('/refresh-redirect', asyncHandler(authController.refreshRedirect));
router.post('/signout', asyncHandler(authController.signOut));

router.get('/me', asyncHandler(authenticate), asyncHandler(authController.me));
router.patch(
  '/profile',
  asyncHandler(authenticate),
  validate({ body: completeProfileSchema }),
  asyncHandler(authController.completeProfile),
);

router.get(
  '/oauth/:provider',
  validate({ params: oauthProviderParamsSchema }),
  asyncHandler(authController.startOAuth),
);

router.get(
  '/oauth/:provider/callback',
  validate({ params: oauthProviderParamsSchema }),
  asyncHandler(authController.oauthCallback),
);

export const authRouter = router;
