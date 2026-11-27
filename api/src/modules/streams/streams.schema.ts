import { z } from 'zod';

export const createStreamSessionSchema = z
  .object({
    destination: z.enum(['youtube', 'custom_rtmp']),
    streamKey: z
      .string({ required_error: 'Stream key is required' })
      .trim()
      .min(1, 'Stream key is required')
      .max(256, 'Stream key is too long'),
    rtmpUrl: z.string().trim().optional(),
    title: z.string().trim().max(100).optional(),
    quality: z.enum(['720p30', '1080p30', '720p60']).default('720p30'),
  })
  .superRefine((data, ctx) => {
    if (data.destination === 'custom_rtmp') {
      if (!data.rtmpUrl || !/^rtmps?:\/\/.+/i.test(data.rtmpUrl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rtmpUrl'],
          message: 'Please provide a valid rtmp:// or rtmps:// server URL',
        });
      }
    }
  });

export const workerStatusUpdateSchema = z.object({
  sessionId: z.string().min(1),
  status: z.enum(['LIVE', 'ENDED', 'FAILED']),
  durationSeconds: z.coerce.number().int().min(0).optional(),
  errorMessage: z.string().max(500).optional(),
});
