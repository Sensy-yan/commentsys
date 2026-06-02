import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, runMigrations } from '../../src/db.js';
import { buildCustomerRouter } from '../../src/routes/customer.js';

describe('POST /customer/sessions', () => {
  let app: ReturnType<typeof buildCustomerRouter>;
  beforeEach(() => {
    const db = openDb(':memory:');
    runMigrations(db);
    app = buildCustomerRouter(db);
  });

  it('creates a session and returns id', async () => {
    const res = await app.request('/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: 'store1', isWeChat: true }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessionId).toMatch(/^[a-z0-9-]+$/);
  });

  it('400 when storeId missing', async () => {
    const res = await app.request('/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});
