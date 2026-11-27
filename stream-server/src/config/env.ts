import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  CLIENT_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:4000'),
  STREAM_TICKET_SECRET: z
    .string()
    .min(32, 'STREAM_TICKET_SECRET must be at least 32 characters'),
  INTERNAL_WORKER_SECRET: z
    .string()
    .min(16, 'INTERNAL_WORKER_SECRET must be at least 16 characters'),
  MAX_CONCURRENT_STREAMS: z.coerce.number().int().positive().default(10),
  MAX_BACKPRESSURE_BYTES: z.coerce.number().int().positive().default(16 * 1024 * 1024),
  FFMPEG_PATH: z.string().min(1).default('ffmpeg'),
  CHROMIUM_PATH: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid stream-server environment:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
