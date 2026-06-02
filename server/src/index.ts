import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { env } from './env.js';

const app = new Hono();

app.get('/health', (c) => c.json({ ok: true, env: env.NODE_ENV }));

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`Server listening on http://localhost:${info.port}`);
});
