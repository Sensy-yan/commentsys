import { Hono } from 'hono';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import type { DB } from '../db.js';

const startSessionSchema = z.object({
  storeId: z.string().min(1),
  isWeChat: z.boolean().optional(),
});

export function buildCustomerRouter(db: DB) {
  const app = new Hono();

  app.post('/sessions', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = startSessionSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'bad_request' }, 400);

    const id = randomUUID();
    const ua = c.req.header('user-agent') ?? '';
    db.prepare(
      `INSERT INTO sessions (id, store_id, user_agent, is_wechat, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(id, parsed.data.storeId, ua, parsed.data.isWeChat ? 1 : 0, Date.now());

    return c.json({ sessionId: id });
  });

  return app;
}
