import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { env } from './env.js';
import { getDb } from './db.js';

mkdirSync(dirname(env.DB_PATH), { recursive: true });
getDb();

const app = new Hono();
app.get('/health', (c) => c.json({ ok: true, env: env.NODE_ENV }));

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`Server listening on http://localhost:${info.port}`);
});
