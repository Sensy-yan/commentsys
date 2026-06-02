import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { env } from './env.js';
import { getDb } from './db.js';
import { buildCustomerRouter } from './routes/customer.js';

mkdirSync(dirname(env.DB_PATH), { recursive: true });
const db = getDb();

const app = new Hono();
app.get('/health', (c) => c.json({ ok: true }));
app.route('/api/customer', buildCustomerRouter(db));

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`Server listening on http://localhost:${info.port}`);
});
