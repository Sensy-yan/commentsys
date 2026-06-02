import { Hono } from 'hono';
import { z } from 'zod';
import type { DB } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const handleSchema = z.object({ note: z.string().max(500).optional() });

export function buildComplaintsRouter(db: DB, jwtSecret: string) {
  const app = new Hono();
  app.use('*', authMiddleware(jwtSecret));

  app.get('/', (c) => {
    const claims = (c.get as (k: string) => unknown)('claims') as { storeId: string };
    const status = c.req.query('status') ?? 'pending';
    const rows = db.prepare(
      `SELECT id, rating, message, contact, status, handler_note, created_at, handled_at
       FROM complaints
       WHERE store_id=? AND status=?
       ORDER BY created_at DESC
       LIMIT 100`,
    ).all(claims.storeId, status);
    return c.json({ items: rows });
  });

  app.post('/:id/handle', async (c) => {
    const claims = (c.get as (k: string) => unknown)('claims') as { storeId: string; operatorId: string };
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const parsed = handleSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'bad_request' }, 400);

    const row = db.prepare('SELECT 1 FROM complaints WHERE id=? AND store_id=?')
      .get(id, claims.storeId);
    if (!row) return c.json({ error: 'not_found' }, 404);

    db.prepare(
      `UPDATE complaints SET status='handled', handler_id=?, handler_note=?, handled_at=?
       WHERE id=?`,
    ).run(claims.operatorId, parsed.data.note ?? null, Date.now(), id);

    return c.json({ ok: true });
  });

  return app;
}
