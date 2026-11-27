import { z } from 'zod';

export const createYouTubeStreamSchema = z.object({
  title: z
    .string({ required_error: 'Stream title is required' })
    .trim()
    .min(1, 'Stream title is required')
    .max(100, 'Stream title must be at most 100 characters'),
});

export const prepareYouTubeBroadcastSchema = z.object({
  streamId: z.string({ required_error: 'Stream key selection is required' }).trim().min(1),
  title: z
    .string({ required_error: 'Broadcast title is required' })
    .trim()
    .min(1, 'Broadcast title is required')
    .max(100, 'Broadcast title must be at most 100 characters'),
  description: z.string().trim().max(5000).optional().default(''),
  privacyStatus: z.enum(['public', 'unlisted', 'private']).default('unlisted'),
});
