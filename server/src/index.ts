import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { env } from './env.js';
import { getDb } from './db.js';
import { buildCustomerRouter } from './routes/customer.js';
import { buildAuthRouter } from './routes/auth.js';

mkdirSync(dirname(env.DB_PATH), { recursive: true });
const db = getDb();

const app = new Hono();
app.get('/health', (c) => c.json({ ok: true }));
app.route('/api/customer', buildCustomerRouter(db));
app.route('/api/auth', buildAuthRouter(db, env.JWT_SECRET, {
  ALIYUN_SMS_ACCESS_KEY: env.ALIYUN_SMS_ACCESS_KEY,
  ALIYUN_SMS_SECRET: env.ALIYUN_SMS_SECRET,
  ALIYUN_SMS_SIGN: env.ALIYUN_SMS_SIGN,
}));

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`Server listening on http://localhost:${info.port}`);
});
