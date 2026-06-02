import { Hono } from 'hono';
import type { Env, Variables } from '../types.js';
import { authMiddleware } from '../middleware/auth.js';

function rangeStart(range: string): number {
  const d = new Date();
  if (range === 'week') d.setDate(d.getDate() - 7);
  else if (range === 'month') d.setMonth(d.getMonth() - 1);
  else { d.setHours(0, 0, 0, 0); }
  return d.getTime();
}

export function buildStatsRouter() {
  const app = new Hono<{ Bindings: Env; Variables: Variables }>();
  app.use('*', authMiddleware);

  app.get('/', async (c) => {
    const claims = c.get('claims') as { storeId: string };
    const range = c.req.query('range') ?? 'today';
    const since = rangeStart(range);

    const totalSessionsRow = await c.env.DB.prepare(
      'SELECT COUNT(*) AS n FROM sessions WHERE store_id=? AND created_at>=?',
    ).bind(claims.storeId, since).first<{ n: number }>();
    const totalSessions = totalSessionsRow?.n ?? 0;

    const ratingRows = (await c.env.DB.prepare(
      'SELECT rating, COUNT(*) AS n FROM sessions WHERE store_id=? AND rating IS NOT NULL AND created_at>=? GROUP BY rating',
    ).bind(claims.storeId, since).all<{ rating: number; n: number }>()).results;
    const ratingBreakdown: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    for (const r of ratingRows) ratingBreakdown[String(r.rating)] = r.n;

    const platformRows = (await c.env.DB.prepare(
      'SELECT platform, COUNT(*) AS n FROM reviews WHERE store_id=? AND copied_at IS NOT NULL AND created_at>=? GROUP BY platform',
    ).bind(claims.storeId, since).all<{ platform: string; n: number }>()).results;
    const platformJumps: Record<string, number> = {
      dianping: 0, meituan: 0, douyin: 0, xiaohongshu: 0,
    };
    for (const p of platformRows) platformJumps[p.platform] = p.n;

    const pendingComplaintsRow = await c.env.DB.prepare(
      "SELECT COUNT(*) AS n FROM complaints WHERE store_id=? AND status='pending'",
    ).bind(claims.storeId).first<{ n: number }>();
    const pendingComplaints = pendingComplaintsRow?.n ?? 0;

    return c.json({
      range,
      totalSessions,
      ratingBreakdown,
      platformJumps,
      totalJumps: Object.values(platformJumps).reduce((a, b) => a + b, 0),
      pendingComplaints,
    });
  });

  return app;
}
