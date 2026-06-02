import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, runMigrations } from '../../src/db.js';
import { buildCustomerRouter } from '../../src/routes/customer.js';

describe('POST /customer/sessions/:id/rating', () => {
  let app: ReturnType<typeof buildCustomerRouter>;
  let db: ReturnType<typeof openDb>;
  let sessionId: string;

  beforeEach(async () => {
    db = openDb(':memory:');
    runMigrations(db);
    app = buildCustomerRouter(db);
    const res = await app.request('/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: 'store1' }),
    });
    sessionId = (await res.json()).sessionId;
  });

  it('stores rating and returns route hint', async () => {
    const res = await app.request(`/sessions/${sessionId}/rating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 5 }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.route).toBe('positive');

    const row = db.prepare('SELECT rating FROM sessions WHERE id=?').get(sessionId) as any;
    expect(row.rating).toBe(5);
  });

  it('routes 1-3 stars to complaint', async () => {
    const res = await app.request(`/sessions/${sessionId}/rating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 2 }),
    });
    const body = await res.json();
    expect(body.route).toBe('complaint');
  });

  it('rejects invalid rating', async () => {
    const res = await app.request(`/sessions/${sessionId}/rating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 0 }),
    });
    expect(res.status).toBe(400);
  });
});
