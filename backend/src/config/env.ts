import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

const dotenvResults = [
  dotenv.config(),
  dotenv.config({ path: path.resolve(__dirname, '../../.env') }),
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') }),
];

const explicitDotenvPort = dotenvResults.find((r) => r.parsed?.PORT)?.parsed?.PORT;
const resolvedPort =
  process.env.BACKEND_PORT ||
  explicitDotenvPort ||
  (process.env.PORT && process.env.PORT !== '8080' ? process.env.PORT : '3000');

const envSchema = z.object({
  PORT: z.string().default('3000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters long')
    .default('trustbridge-dev-secret-key-change-in-production-32chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  DATABASE_PATH: z.string().default('./database/trustbridge.db'),
  ENABLE_DEMO_SEED: z
    .string()
    .optional()
    .default('false')
    .transform((val) => val.trim().toLowerCase() === 'true'),
  DEMO_ADMIN_EMAIL: z.string().optional().default(''),
  DEMO_ADMIN_PASSWORD: z.string().optional().default(''),
  DEMO_BUYER_EMAIL: z.string().optional().default(''),
  DEMO_BUYER_PASSWORD: z.string().optional().default(''),
  DEMO_SELLER_EMAIL: z.string().optional().default(''),
  DEMO_SELLER_PASSWORD: z.string().optional().default(''),
  TRANSLATION_PROVIDER: z.enum(['none', 'libretranslate']).default('none'),
  TRANSLATION_API_URL: z.string().optional().default(''),
  TRANSLATION_API_KEY: z.string().optional().default(''),
  NEXCONN_APP_KEY: z.string().optional().default(''),
  NEXCONN_APP_SECRET: z.string().optional().default(''),
  NEXCONN_AREA_CODE: z.enum(['SG', 'NA', 'SA', 'BJ', 'OM']).default('SG'),
  NEXCONN_API_BASE_URL: z.string().optional().default(''),
}).superRefine((data, ctx) => {
  if (
    data.NODE_ENV === 'production' &&
    data.JWT_SECRET === 'trustbridge-dev-secret-key-change-in-production-32chars'
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['JWT_SECRET'],
      message: 'JWT_SECRET must be explicitly set to a unique secret in production.',
    });
  }
});

const parsedEnv = envSchema.safeParse({
  ...process.env,
  PORT: resolvedPort,
});

if (!parsedEnv.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const env = parsedEnv.data;
