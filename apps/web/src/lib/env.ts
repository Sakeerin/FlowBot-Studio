import { envSchema } from '@shared/schemas/env';
import { z } from 'zod';

// Client-side env schema (subset)
const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3001/api'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export function validateEnv() {
  if (typeof window === 'undefined') {
    // Server-side
    return envSchema.parse(process.env);
  } else {
    // Client-side
    return clientEnvSchema.parse({
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NODE_ENV: process.env.NODE_ENV,
    });
  }
}
