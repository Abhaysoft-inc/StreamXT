import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import * as youtubeController from './youtube.controller';
import { createYouTubeStreamSchema } from './youtube.schema';

const router = Router();

router.get('/oauth/start', asyncHandler(authenticate), asyncHandler(youtubeController.startOAuth));
router.get('/oauth/callback', asyncHandler(youtubeController.oauthCallback));

router.get('/connection', asyncHandler(authenticate), asyncHandler(youtubeController.getConnection));
router.delete('/connection', asyncHandler(authenticate), asyncHandler(youtubeController.disconnect));

router.get('/streams', asyncHandler(authenticate), asyncHandler(youtubeController.listStreams));
router.get('/history', asyncHandler(authenticate), asyncHandler(youtubeController.listHistory));
router.post(
  '/streams',
  asyncHandler(authenticate),
  validate({ body: createYouTubeStreamSchema }),
  asyncHandler(youtubeController.createStream),
);

export const youtubeRouter = router;
