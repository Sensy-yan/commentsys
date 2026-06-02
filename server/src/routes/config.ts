import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, Variables } from '../types.js';
import { authMiddleware } from '../middleware/auth.js';
import { logAction } from '../services/audit.js';

const configSchema = z.object({
  name: z.string().max(50).optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(200).optional(),
  technicians: z.array(z.string()).default([]),
  projects: z.array(z.string()).default([]),
  platform_urls: z.record(z.string(), z.string()).default({}),
  wecom_webhook: z.string().optional(),
});

export function buildConfigRouter() {
  const app = new Hono<{ Bindings: Env; Variables: Variables }>();
  app.use('*', authMiddleware);

  app.get('/', async (c) => {
    const claims = c.get('claims') as { storeId: string };
    const row = await c.env.DB.prepare('SELECT * FROM store_config WHERE store_id=?')
      .bind(claims.storeId).first<any>();
    if (!row) return c.json({
      name: '', phone: '', address: '',
      technicians: [], projects: [],
      platform_urls: {}, wecom_webhook: '',
    });
    return c.json({
      name: row.name ?? '',
      phone: row.phone ?? '',
      address: row.address ?? '',
      technicians: JSON.parse(row.technicians ?? '[]'),
      projects: JSON.parse(row.projects ?? '[]'),
      platform_urls: JSON.parse(row.platform_urls ?? '{}'),
      wecom_webhook: row.wecom_webhook ?? '',
    });
  });

  app.put('/', async (c) => {
    const claims = c.get('claims') as { storeId: string; operatorId: string };
    const body = await c.req.json().catch(() => ({}));
    const parsed = configSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'bad_request', issues: parsed.error.issues }, 400);

    await c.env.DB.prepare(`INSERT INTO store_config
      (store_id, name, address, phone, platform_urls, wecom_webhook, technicians, projects, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(store_id) DO UPDATE SET
        name=excluded.name, address=excluded.address, phone=excluded.phone,
        platform_urls=excluded.platform_urls, wecom_webhook=excluded.wecom_webhook,
        technicians=excluded.technicians, projects=excluded.projects,
        updated_at=excluded.updated_at`,
    ).bind(
      claims.storeId,
      parsed.data.name ?? null,
      parsed.data.address ?? null,
      parsed.data.phone ?? null,
      JSON.stringify(parsed.data.platform_urls),
      parsed.data.wecom_webhook ?? null,
      JSON.stringify(parsed.data.technicians),
      JSON.stringify(parsed.data.projects),
      Date.now(),
    ).run();

    await logAction(c.env.DB, {
      operatorId: claims.operatorId,
      action: 'config_updated',
      targetType: 'store_config',
      targetId: claims.storeId,
    });

    return c.json({ ok: true });
  });

  return app;
}
