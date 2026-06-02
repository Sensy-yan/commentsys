import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, Variables } from '../types.js';
import { authMiddleware } from '../middleware/auth.js';

const metadataSchema = z.object({
  type: z.enum(['环境', '过程', '效果']),
  platforms: z.array(z.string()),
  rating_match: z.array(z.number()),
  tags: z.array(z.string()).default([]),
});

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

export function buildPhotosRouter() {
  const app = new Hono<{ Bindings: Env; Variables: Variables }>();
  app.use('*', authMiddleware);

  app.get('/', async (c) => {
    const claims = c.get('claims') as { storeId: string };
    const rows = (await c.env.DB.prepare(
      `SELECT id, url, type, platforms, rating_match, tags, use_count, created_at
       FROM photos WHERE store_id=? ORDER BY created_at DESC`,
    ).bind(claims.storeId).all<any>()).results;
    const items = rows.map((r: any) => ({
      ...r,
      platforms: JSON.parse(r.platforms),
      rating_match: JSON.parse(r.rating_match),
      tags: JSON.parse(r.tags || '[]'),
    }));
    return c.json({ items });
  });

  app.post('/', async (c) => {
    const claims = c.get('claims') as { storeId: string; operatorId: string };
    const form = await c.req.formData();
    const file = form.get('file') as File | null;
    if (!file) return c.json({ error: 'no_file' }, 400);
    if (!ALLOWED_MIME.includes(file.type)) return c.json({ error: 'bad_mime' }, 400);
    if (file.size > MAX_BYTES) return c.json({ error: 'too_large' }, 413);

    const meta = metadataSchema.safeParse({
      type: form.get('type'),
      platforms: JSON.parse(String(form.get('platforms') ?? '[]')),
      rating_match: JSON.parse(String(form.get('rating_match') ?? '[]')),
      tags: JSON.parse(String(form.get('tags') ?? '[]')),
    });
    if (!meta.success) return c.json({ error: 'bad_metadata' }, 400);

    const id = crypto.randomUUID();
    const url = `/uploads/${id}`;
    const buffer = await file.arrayBuffer();

    // Use batch for atomicity
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO photos (id, store_id, url, type, platforms, rating_match, tags, uploaded_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        id, claims.storeId, url, meta.data.type,
        JSON.stringify(meta.data.platforms),
        JSON.stringify(meta.data.rating_match),
        JSON.stringify(meta.data.tags),
        claims.operatorId, Date.now(),
      ),
      c.env.DB.prepare(
        'INSERT INTO photo_data (photo_id, mime, data) VALUES (?, ?, ?)',
      ).bind(id, file.type, buffer),
    ]);

    return c.json({ id, url });
  });

  app.delete('/:id', async (c) => {
    const claims = c.get('claims') as { storeId: string };
    const id = c.req.param('id');
    const result = await c.env.DB.batch([
      c.env.DB.prepare('DELETE FROM photo_data WHERE photo_id=?').bind(id),
      c.env.DB.prepare('DELETE FROM photos WHERE id=? AND store_id=?').bind(id, claims.storeId),
    ]);
    // The photos delete is the source of truth for permission. Check changes there.
    const photosDelete = result[1];
    if (photosDelete.meta.changes === 0) return c.json({ error: 'not_found' }, 404);
    return c.json({ ok: true });
  });

  return app;
}
