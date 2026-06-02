import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, runMigrations } from '../../src/db.js';
import { buildConfigRouter } from '../../src/routes/config.js';
import { signToken } from '../../src/services/auth.js';

const SECRET = 'test';

describe('admin/config', () => {
  let app: ReturnType<typeof buildConfigRouter>;
  let token: string;
  let db: ReturnType<typeof openDb>;

  beforeEach(async () => {
    db = openDb(':memory:');
    runMigrations(db);
    app = buildConfigRouter(db, SECRET);
    token = await signToken({ operatorId: 'op1', storeId: 's1' }, SECRET);
  });

  it('returns defaults when empty', async () => {
    const res = await app.request('/', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    expect(body.technicians).toEqual([]);
    expect(body.projects).toEqual([]);
  });

  it('saves and reads config', async () => {
    const payload = {
      name: '养发店',
      phone: '12345',
      address: '上海',
      technicians: ['小王', '小李'],
      projects: ['头皮检测'],
      platform_urls: { dianping: 'https://dianping.com/shop/123' },
      wecom_webhook: 'https://x',
    };
    await app.request('/', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const res = await app.request('/', { headers: { Authorization: `Bearer ${token}` } });
    const body = await res.json();
    expect(body.name).toBe('养发店');
    expect(body.technicians).toEqual(['小王', '小李']);
  });
});
