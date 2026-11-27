import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import * as youtubeController from './youtube.controller';
import {
  createYouTubePollSchema,
  createYouTubeStreamSchema,
  prepareYouTubeBroadcastSchema,
  sendYouTubeChatSchema,
} from './youtube.schema';

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
router.post(
  '/broadcasts',
  asyncHandler(authenticate),
  validate({ body: prepareYouTubeBroadcastSchema }),
  asyncHandler(youtubeController.prepareBroadcast),
);

router.get('/chat/session', asyncHandler(authenticate), asyncHandler(youtubeController.getChatSession));
router.get('/chat/messages', asyncHandler(authenticate), asyncHandler(youtubeController.getChatMessages));
router.post(
  '/chat/messages',
  asyncHandler(authenticate),
  validate({ body: sendYouTubeChatSchema }),
  asyncHandler(youtubeController.postChatMessage),
);

router.post(
  '/polls',
  asyncHandler(authenticate),
  validate({ body: createYouTubePollSchema }),
  asyncHandler(youtubeController.createPoll),
);
router.post(
  '/polls/:pollId/close',
  asyncHandler(authenticate),
  asyncHandler(youtubeController.closePoll),
);

export const youtubeRouter = router;
