import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  ENCRYPTION_MASTER_KEY: z.string().length(64, 'ENCRYPTION_MASTER_KEY must be a 64-character hex string'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('24h')
});

export type Env = z.infer<typeof EnvSchema>;

function parseEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment configuration:', result.error.format());
    throw new Error('Environment variable validation failed');
  }
  return result.data;
}

export const env = parseEnv();
