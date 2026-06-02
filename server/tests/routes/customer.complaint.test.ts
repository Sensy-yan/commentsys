import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, runMigrations } from '../../src/db.js';
import { buildCustomerRouter } from '../../src/routes/customer.js';

describe('POST /customer/complaints', () => {
  let app: ReturnType<typeof buildCustomerRouter>;
  let db: ReturnType<typeof openDb>;
  let sessionId: string;

  beforeEach(async () => {
    db = openDb(':memory:');
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
      body: JSON.stringify({ rating: 2 }),
    });
  });

  it('inserts a complaint row', async () => {
    const res = await app.request('/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        message: '技师按摩太轻',
        contact: '13800001111',
      }),
    });
    expect(res.status).toBe(200);
    const row = db.prepare(
      'SELECT message, rating, status FROM complaints WHERE session_id=?',
    ).get(sessionId) as any;
    expect(row.message).toBe('技师按摩太轻');
    expect(row.rating).toBe(2);
    expect(row.status).toBe('pending');
  });
});
