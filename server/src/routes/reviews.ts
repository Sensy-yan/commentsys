import { Hono } from 'hono';
import type { Env, Variables } from '../types.js';
import { authMiddleware } from '../middleware/auth.js';

function rangeStart(range: string): number {
  const d = new Date();
  if (range === 'week') d.setDate(d.getDate() - 7);
  else if (range === 'month') d.setMonth(d.getMonth() - 1);
  else if (range === 'all') return 0;
  else { d.setHours(0, 0, 0, 0); }
  return d.getTime();
}

export function buildReviewsRouter() {
  const app = new Hono<{ Bindings: Env; Variables: Variables }>();
  app.use('*', authMiddleware);

  app.get('/', async (c) => {
    const claims = c.get('claims') as { storeId: string };
    const range = c.req.query('range') ?? 'today';
    const since = rangeStart(range);

    const rows = (await c.env.DB.prepare(
      `SELECT id, rating, platform, project_tags, technician_id, ai_text, edited_text,
              photo_ids, copied_at, jumped_to_app, created_at
       FROM reviews
       WHERE store_id=? AND created_at>=?
       ORDER BY created_at DESC
       LIMIT 200`,
    ).bind(claims.storeId, since).all<any>()).results;

    const items = rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      platform: r.platform,
      tags: JSON.parse(r.project_tags ?? '[]'),
      technician: r.technician_id ?? '',
      text: r.edited_text ?? r.ai_text ?? '',
      photo_count: JSON.parse(r.photo_ids ?? '[]').length,
      jumped: !!r.jumped_to_app,
      created_at: r.created_at,
    }));

    return c.json({ range, items });
  });

  return app;
}
