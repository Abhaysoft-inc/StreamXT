import { z } from 'zod';

export const createYouTubeStreamSchema = z.object({
  title: z
    .string({ required_error: 'Stream title is required' })
    .trim()
    .min(1, 'Stream title is required')
    .max(100, 'Stream title must be at most 100 characters'),
});
