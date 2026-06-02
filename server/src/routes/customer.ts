import { Hono } from 'hono';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import type { DB } from '../db.js';

const startSessionSchema = z.object({
  storeId: z.string().min(1),
  isWeChat: z.boolean().optional(),
});

const ratingSchema = z.object({ rating: z.number().int().min(1).max(5) });

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

  app.post('/sessions/:id/rating', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const parsed = ratingSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'bad_request' }, 400);

    const exists = db.prepare('SELECT 1 FROM sessions WHERE id=?').get(id);
    if (!exists) return c.json({ error: 'session_not_found' }, 404);

    db.prepare('UPDATE sessions SET rating=?, updated_at=? WHERE id=?').run(
      parsed.data.rating, Date.now(), id,
    );

    return c.json({
      route: parsed.data.rating >= 4 ? 'positive' : 'complaint',
    });
  });

  return app;
}
