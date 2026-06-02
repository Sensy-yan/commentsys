import { Hono } from 'hono';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import type { DB } from '../db.js';
import { generateReview } from '../services/llm.js';
import { composeFromPool } from '../services/templatePool.js';

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

  app.post('/complaints', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = complaintSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'bad_request' }, 400);

    const session = db.prepare(
      'SELECT store_id, rating FROM sessions WHERE id=?',
    ).get(parsed.data.sessionId) as any;
    if (!session) return c.json({ error: 'session_not_found' }, 404);
    if (!session.rating || session.rating > 3) {
      return c.json({ error: 'rating_not_eligible' }, 400);
    }

    const id = randomUUID();
    db.prepare(
      `INSERT INTO complaints (id, session_id, store_id, rating, message, contact, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
    ).run(
      id,
      parsed.data.sessionId,
      session.store_id,
      session.rating,
      parsed.data.message,
      parsed.data.contact ?? null,
      Date.now(),
    );

    return c.json({ complaintId: id });
  });

  app.post('/reviews/generate', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'bad_request' }, 400);

    const session = db.prepare('SELECT rating FROM sessions WHERE id=?').get(parsed.data.sessionId) as any;
    const rating = session?.rating ?? 5;

    const input = {
      platform: parsed.data.platform,
      rating,
      tags: parsed.data.tags,
      technician: parsed.data.technician,
    };

    // Read fresh each request so tests can flip the env var.
    // Production: NODE_ENV=production, env is set once at deploy, so this is fine.
    const apiKey = process.env.DEEPSEEK_API_KEY;

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

  return app;
}
