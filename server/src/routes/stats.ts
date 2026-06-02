import { Hono } from 'hono';
import type { DB } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

function rangeStart(range: string): number {
  const d = new Date();
  if (range === 'week') d.setDate(d.getDate() - 7);
  else if (range === 'month') d.setMonth(d.getMonth() - 1);
  else { d.setHours(0, 0, 0, 0); }
  return d.getTime();
}

export function buildStatsRouter(db: DB, jwtSecret: string) {
  const app = new Hono();
  app.use('*', authMiddleware(jwtSecret));

  app.get('/', (c) => {
    const claims = (c.get as (k: string) => unknown)('claims') as { storeId: string };
    const range = c.req.query('range') ?? 'today';
    const since = rangeStart(range);

    const totalSessions = (db.prepare(
      'SELECT COUNT(*) AS n FROM sessions WHERE store_id=? AND created_at>=?',
    ).get(claims.storeId, since) as any).n;

    const ratingRows = db.prepare(
      'SELECT rating, COUNT(*) AS n FROM sessions WHERE store_id=? AND rating IS NOT NULL AND created_at>=? GROUP BY rating',
    ).all(claims.storeId, since) as Array<{ rating: number; n: number }>;
    const ratingBreakdown: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    for (const r of ratingRows) ratingBreakdown[String(r.rating)] = r.n;

    const platformRows = db.prepare(
      'SELECT platform, COUNT(*) AS n FROM reviews WHERE store_id=? AND copied_at IS NOT NULL AND created_at>=? GROUP BY platform',
    ).all(claims.storeId, since) as Array<{ platform: string; n: number }>;
    const platformJumps: Record<string, number> = {
      dianping: 0, meituan: 0, douyin: 0, xiaohongshu: 0,
    };
    for (const p of platformRows) platformJumps[p.platform] = p.n;

    const pendingComplaints = (db.prepare(
      "SELECT COUNT(*) AS n FROM complaints WHERE store_id=? AND status='pending'",
    ).get(claims.storeId) as any).n;

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
