import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import * as streamsController from './streams.controller';
import { createStreamSessionSchema, workerStatusUpdateSchema } from './streams.schema';

const router = Router();

router.post(
  '/sessions',
  asyncHandler(authenticate),
  validate({ body: createStreamSessionSchema }),
  asyncHandler(streamsController.createSession),
);

router.get(
  '/sessions',
  asyncHandler(authenticate),
  asyncHandler(streamsController.listSessions),
);

router.post(
  '/internal/status',
  validate({ body: workerStatusUpdateSchema }),
  asyncHandler(streamsController.updateStatusFromWorker),
);

export const streamsRouter = router;
