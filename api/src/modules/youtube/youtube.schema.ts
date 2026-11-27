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
    .max(100, 'Title must be at most 100 characters'),
  description: z.string().trim().max(5000).optional().default(''),
  privacyStatus: z.enum(['public', 'unlisted', 'private']).default('unlisted'),
});

export const sendYouTubeChatSchema = z.object({
  liveChatId: z.string({ required_error: 'Live chat ID is required' }).trim().min(1),
  message: z
    .string({ required_error: 'Message is required' })
    .trim()
    .min(1, 'Message cannot be empty')
    .max(200, 'YouTube Live Chat messages are limited to 200 characters'),
});

export const createYouTubePollSchema = z.object({
  liveChatId: z.string({ required_error: 'Live chat ID is required' }).trim().min(1),
  question: z
    .string({ required_error: 'Poll question is required' })
    .trim()
    .min(1, 'Poll question is required')
    .max(150, 'Poll question must be at most 150 characters'),
  options: z
    .array(z.string().trim().min(1, 'Option cannot be empty').max(60, 'Option max 60 chars'))
    .min(2, 'At least 2 options are required')
    .max(4, 'YouTube polls support at most 4 options'),
});
