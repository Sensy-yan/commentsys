import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, Variables } from '../types.js';
import { generateReview } from '../services/llm.js';
import { composeFromPool } from '../services/templatePool.js';
import { notifyComplaint } from '../services/notification.js';

const startSessionSchema = z.object({
  storeId: z.string().min(1),
  isWeChat: z.boolean().optional(),
});

const ratingSchema = z.object({ rating: z.number().int().min(1).max(5) });

const complaintSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(1000),
  contact: z.string().max(50).optional(),
});

const PLATFORMS = ['dianping', 'meituan', 'douyin', 'xiaohongshu'] as const;
const generateSchema = z.object({
  sessionId: z.string().uuid(),
  platform: z.enum(PLATFORMS),
  tags: z.array(z.string()).default([]),
  technician: z.string().default(''),
});

const recommendSchema = z.object({
  sessionId: z.string().min(1),
  platform: z.enum(PLATFORMS),
  limit: z.coerce.number().min(1).max(10).default(5),
});

const logJumpSchema = z.object({
  sessionId: z.string().min(1),
  platform: z.enum(PLATFORMS),
  tags: z.array(z.string()).default([]),
  technician: z.string().default(''),
  photoIds: z.array(z.string()).default([]),
  text: z.string(),
});

export function buildCustomerRouter() {
  const app = new Hono<{ Bindings: Env; Variables: Variables }>();

  app.post('/sessions', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = startSessionSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'bad_request' }, 400);

    const id = crypto.randomUUID();
    const ua = c.req.header('user-agent') ?? '';
    await c.env.DB.prepare(
      `INSERT INTO sessions (id, store_id, user_agent, is_wechat, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).bind(id, parsed.data.storeId, ua, parsed.data.isWeChat ? 1 : 0, Date.now()).run();

    return c.json({ sessionId: id });
  });

  app.post('/sessions/:id/rating', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const parsed = ratingSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'bad_request' }, 400);

    const exists = await c.env.DB.prepare('SELECT 1 FROM sessions WHERE id=?').bind(id).first();
    if (!exists) return c.json({ error: 'session_not_found' }, 404);

    await c.env.DB.prepare('UPDATE sessions SET rating=?, updated_at=? WHERE id=?').bind(
      parsed.data.rating, Date.now(), id,
    ).run();

    return c.json({
      route: parsed.data.rating >= 4 ? 'positive' : 'complaint',
    });
  });

  app.post('/complaints', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = complaintSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'bad_request' }, 400);

    const session = await c.env.DB.prepare(
      'SELECT store_id, rating FROM sessions WHERE id=?',
    ).bind(parsed.data.sessionId).first<any>();
    if (!session) return c.json({ error: 'session_not_found' }, 404);
    if (!session.rating || session.rating > 3) {
      return c.json({ error: 'rating_not_eligible' }, 400);
    }

    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO complaints (id, session_id, store_id, rating, message, contact, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
    ).bind(
      id,
      parsed.data.sessionId,
      session.store_id,
      session.rating,
      parsed.data.message,
      parsed.data.contact ?? null,
      Date.now(),
    ).run();

    const config = await c.env.DB.prepare('SELECT wecom_webhook FROM store_config WHERE store_id=?')
      .bind(session.store_id).first<any>();
    const webhookUrl = config?.wecom_webhook ?? c.env.WECOM_WEBHOOK_URL ?? '';

    notifyComplaint({
      webhookUrl,
      complaintId: id,
      rating: session.rating,
      message: parsed.data.message,
      contact: parsed.data.contact ?? null,
      adminUrl: `${c.req.url.replace(/\/api\/customer\/complaints$/, '')}/admin/#/complaints`,
    }).catch(() => {});  // 不阻塞响应

    return c.json({ complaintId: id });
  });

  app.post('/reviews/generate', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'bad_request' }, 400);

    const session = await c.env.DB.prepare('SELECT rating FROM sessions WHERE id=?')
      .bind(parsed.data.sessionId).first<any>();
    const rating = session?.rating ?? 5;

    const input = {
      platform: parsed.data.platform,
      rating,
      tags: parsed.data.tags,
      technician: parsed.data.technician,
    };

    const apiKey = c.env.DEEPSEEK_API_KEY;

    // 1) 没配 API key,直接走模板
    if (!apiKey) {
      return c.json({ text: composeFromPool(input), source: 'template' });
    }

    // 2) 调 LLM,失败兜底
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      const out = await generateReview(input, apiKey, controller.signal);
      clearTimeout(timer);
      return c.json({ text: out.text, source: 'ai' });
    } catch (err) {
      console.error('LLM failed, falling back to template:', err);
      return c.json({ text: composeFromPool(input), source: 'template' });
    }
  });

  app.get('/photos/recommend', async (c) => {
    const parsed = recommendSchema.safeParse({
      sessionId: c.req.query('sessionId'),
      platform: c.req.query('platform'),
      limit: c.req.query('limit'),
    });
    if (!parsed.success) return c.json({ error: 'bad_request' }, 400);

    const session = await c.env.DB.prepare('SELECT store_id, rating FROM sessions WHERE id=?')
      .bind(parsed.data.sessionId).first<any>();
    if (!session) return c.json({ error: 'session_not_found' }, 404);

    const allPhotos = (await c.env.DB.prepare(
      'SELECT id, url, type, platforms, rating_match FROM photos WHERE store_id=?',
    ).bind(session.store_id).all<any>()).results;

    const filtered = allPhotos
      .map((p: any) => ({
        ...p,
        platforms: JSON.parse(p.platforms) as string[],
        rating_match: JSON.parse(p.rating_match) as number[],
      }))
      .filter((p: any) =>
        p.platforms.includes(parsed.data.platform) &&
        (session.rating == null || p.rating_match.includes(session.rating))
      );

    // 随机洗牌后取 limit 张
    for (let i = filtered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }

    return c.json({ items: filtered.slice(0, parsed.data.limit) });
  });

  app.post('/reviews/log-jump', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = logJumpSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'bad_request' }, 400);

    const session = await c.env.DB.prepare('SELECT store_id, rating FROM sessions WHERE id=?')
      .bind(parsed.data.sessionId).first<any>();
    if (!session) return c.json({ error: 'session_not_found' }, 404);

    const id = crypto.randomUUID();
    await c.env.DB.prepare(`INSERT INTO reviews
      (id, session_id, store_id, rating, platform, project_tags, technician_id, edited_text, photo_ids, copied_at, jumped_to_app, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    ).bind(
      id,
      parsed.data.sessionId,
      session.store_id,
      session.rating,
      parsed.data.platform,
      JSON.stringify(parsed.data.tags),
      parsed.data.technician,
      parsed.data.text,
      JSON.stringify(parsed.data.photoIds),
      Date.now(),
      Date.now(),
    ).run();

    // 累加照片 use_count
    if (parsed.data.photoIds.length) {
      const stmt = c.env.DB.prepare('UPDATE photos SET use_count=use_count+1 WHERE id=?');
      await c.env.DB.batch(parsed.data.photoIds.map((pid) => stmt.bind(pid)));
    }

    return c.json({ ok: true });
  });

  app.get('/config/:storeId', async (c) => {
    const storeId = c.req.param('storeId');
    const row = await c.env.DB.prepare('SELECT name, platform_urls FROM store_config WHERE store_id=?')
      .bind(storeId).first<any>();
    if (!row) return c.json({ name: '', platformUrls: {} });
    return c.json({
      name: row.name ?? '',
      platformUrls: JSON.parse(row.platform_urls ?? '{}'),
    });
  });

  return app;
}
