import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, Variables } from '../types.js';
import { authMiddleware } from '../middleware/auth.js';
import { logAction } from '../services/audit.js';

const handleSchema = z.object({ note: z.string().max(500).optional() });

export function buildComplaintsRouter() {
  const app = new Hono<{ Bindings: Env; Variables: Variables }>();
  app.use('*', authMiddleware);

  app.get('/', async (c) => {
    const claims = c.get('claims') as { storeId: string };
    const status = c.req.query('status') ?? 'pending';
    const rows = (await c.env.DB.prepare(
      `SELECT id, rating, message, contact, status, handler_note, created_at, handled_at
       FROM complaints
       WHERE store_id=? AND status=?
       ORDER BY created_at DESC
       LIMIT 100`,
    ).bind(claims.storeId, status).all<any>()).results;
    return c.json({ items: rows });
  });

  app.post('/:id/handle', async (c) => {
    const claims = c.get('claims') as { storeId: string; operatorId: string };
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const parsed = handleSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'bad_request' }, 400);

    const row = await c.env.DB.prepare('SELECT 1 FROM complaints WHERE id=? AND store_id=?')
      .bind(id, claims.storeId).first();
    if (!row) return c.json({ error: 'not_found' }, 404);

    await c.env.DB.prepare(
      `UPDATE complaints SET status='handled', handler_id=?, handler_note=?, handled_at=?
       WHERE id=?`,
    ).bind(claims.operatorId, parsed.data.note ?? null, Date.now(), id).run();

    await logAction(c.env.DB, {
      operatorId: claims.operatorId,
      action: 'complaint_handled',
      targetType: 'complaint',
      targetId: id,
      details: { note: parsed.data.note ?? null },
    });

    return c.json({ ok: true });
  });

  return app;
}
