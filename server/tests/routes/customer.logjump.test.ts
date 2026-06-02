import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, runMigrations } from '../../src/db.js';
import { buildCustomerRouter } from '../../src/routes/customer.js';

describe('POST /reviews/log-jump', () => {
  let app: ReturnType<typeof buildCustomerRouter>;
  let sessionId: string;
  let db: ReturnType<typeof openDb>;

  beforeEach(async () => {
    db = openDb(':memory:');
    runMigrations(db);
    app = buildCustomerRouter(db);
    const r = await app.request('/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: 's1' }),
    });
    sessionId = (await r.json()).sessionId;
    await app.request(`/sessions/${sessionId}/rating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 5 }),
    });
  });

  it('records jump and increments photo use_count', async () => {
    db.prepare(`INSERT INTO photos (id, store_id, url, type, platforms, rating_match, tags, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('p1', 's1', '/1.jpg', '环境', '[]', '[]', '[]', Date.now());

    const res = await app.request('/reviews/log-jump', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId, platform: 'dianping', tags: ['头皮检测'],
        technician: '小王', photoIds: ['p1'], text: '不错',
      }),
    });
    expect(res.status).toBe(200);

    const review = db.prepare('SELECT platform, copied_at, jumped_to_app FROM reviews WHERE session_id=?').get(sessionId) as any;
    expect(review.platform).toBe('dianping');
    expect(review.jumped_to_app).toBe(1);
    expect(review.copied_at).toBeGreaterThan(0);

    const photo = db.prepare('SELECT use_count FROM photos WHERE id=?').get('p1') as any;
    expect(photo.use_count).toBe(1);
  });
});
