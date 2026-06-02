import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, runMigrations } from '../../src/db.js';
import { buildStatsRouter } from '../../src/routes/stats.js';
import { signToken } from '../../src/services/auth.js';

const SECRET = 'test';

async function tokenFor(storeId: string) {
  return await signToken({ operatorId: 'op1', storeId }, SECRET);
}

describe('GET /admin/stats', () => {
  let app: ReturnType<typeof buildStatsRouter>;
  let db: ReturnType<typeof openDb>;

  beforeEach(() => {
    db = openDb(':memory:');
    runMigrations(db);
    app = buildStatsRouter(db, SECRET);

    // 插入测试数据
    const now = Date.now();
    db.prepare("INSERT INTO sessions (id, store_id, rating, created_at) VALUES (?, ?, ?, ?)")
      .run('s1', 's1', 5, now);
    db.prepare("INSERT INTO sessions (id, store_id, rating, created_at) VALUES (?, ?, ?, ?)")
      .run('s2', 's1', 4, now);
    db.prepare("INSERT INTO sessions (id, store_id, rating, created_at) VALUES (?, ?, ?, ?)")
      .run('s3', 's1', 2, now);

    db.prepare(`INSERT INTO reviews (id, session_id, store_id, rating, platform, copied_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run('r1', 's1', 's1', 5, 'dianping', now, now);

    db.prepare(`INSERT INTO complaints (id, session_id, store_id, rating, message, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run('c1', 's3', 's1', 2, 'bad', 'pending', now);
  });

  it('returns aggregated counts for today', async () => {
    const token = await tokenFor('s1');
    const res = await app.request('/?range=today', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalSessions).toBe(3);
    expect(body.ratingBreakdown).toEqual({ '1': 0, '2': 1, '3': 0, '4': 1, '5': 1 });
    expect(body.platformJumps.dianping).toBe(1);
    expect(body.pendingComplaints).toBe(1);
  });

  it('scopes by storeId from token', async () => {
    db.prepare("INSERT INTO sessions (id, store_id, rating, created_at) VALUES (?, ?, ?, ?)")
      .run('sx', 'OTHER_STORE', 5, Date.now());

    const token = await tokenFor('s1');
    const res = await app.request('/?range=today', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    expect(body.totalSessions).toBe(3);
  });

  it('rejects without token', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(401);
  });
});
