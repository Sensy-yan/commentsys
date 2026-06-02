import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(8787),
  DB_PATH: z.string().default('./data/commentsys.db'),
  DEEPSEEK_API_KEY: z.string().optional(),
  ALIYUN_SMS_ACCESS_KEY: z.string().optional(),
  ALIYUN_SMS_SECRET: z.string().optional(),
  ALIYUN_SMS_SIGN: z.string().optional(),
  ALIYUN_OSS_BUCKET: z.string().optional(),
  ALIYUN_OSS_ACCESS_KEY: z.string().optional(),
  ALIYUN_OSS_SECRET: z.string().optional(),
  WECOM_WEBHOOK_URL: z.string().optional(),
  JWT_SECRET: z.string().default('dev-secret-change-me'),
  CUSTOMER_BASE_URL: z.string().default('http://localhost:5173'),
});

export const env = schema.parse(process.env);
