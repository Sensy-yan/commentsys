import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, runMigrations } from '../../src/db.js';
import { buildCustomerRouter } from '../../src/routes/customer.js';

describe('POST /customer/reviews/generate', () => {
  let app: ReturnType<typeof buildCustomerRouter>;
  let sessionId: string;

  beforeEach(async () => {
    const db = openDb(':memory:');
    runMigrations(db);
    app = buildCustomerRouter(db);
    const r = await app.request('/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: 'store1' }),
    });
    sessionId = (await r.json()).sessionId;
    await app.request(`/sessions/${sessionId}/rating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 5 }),
    });
  });

  it('returns a non-empty review text', async () => {
    const res = await app.request('/reviews/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        platform: 'dianping',
        tags: ['头皮检测'],
        technician: '小王',
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.text.length).toBeGreaterThan(20);
    expect(body.source).toBe('stub');
  });

  it('400 on unknown platform', async () => {
    const res = await app.request('/reviews/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, platform: 'twitter', tags: [], technician: '' }),
    });
    expect(res.status).toBe(400);
  });
});
