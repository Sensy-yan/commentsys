import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, runMigrations } from '../../src/db.js';
import { buildCustomerRouter } from '../../src/routes/customer.js';

describe('GET /customer/photos/recommend', () => {
  let app: ReturnType<typeof buildCustomerRouter>;
  let db: ReturnType<typeof openDb>;

  beforeEach(async () => {
    db = openDb(':memory:');
    runMigrations(db);

    db.prepare("INSERT INTO sessions (id, store_id, rating, created_at) VALUES (?, ?, ?, ?)")
      .run('sess1', 's1', 5, Date.now());

    const ins = db.prepare(`INSERT INTO photos (id, store_id, url, type, platforms, rating_match, tags, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    ins.run('p1', 's1', '/1.jpg', '环境', '["dianping"]', '[5]', '["头皮检测"]', Date.now());
    ins.run('p2', 's1', '/2.jpg', '过程', '["dianping","meituan"]', '[4,5]', '[]', Date.now());
    ins.run('p3', 's1', '/3.jpg', '效果', '["xiaohongshu"]', '[5]', '[]', Date.now());

    app = buildCustomerRouter(db);
  });

  it('returns photos matching platform and rating', async () => {
    const res = await app.request('/photos/recommend?sessionId=sess1&platform=dianping&limit=5');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items.map((p: any) => p.id).sort()).toEqual(['p1', 'p2']);
  });

  it('excludes platforms outside selection', async () => {
    const res = await app.request('/photos/recommend?sessionId=sess1&platform=xiaohongshu&limit=5');
    const body = await res.json();
    expect(body.items.map((p: any) => p.id)).toEqual(['p3']);
  });
});
