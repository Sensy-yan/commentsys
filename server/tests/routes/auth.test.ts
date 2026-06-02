import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openDb, runMigrations } from '../../src/db.js';
import { buildAuthRouter } from '../../src/routes/auth.js';

describe('auth routes', () => {
  let app: ReturnType<typeof buildAuthRouter>;
  let db: ReturnType<typeof openDb>;

  beforeEach(() => {
    db = openDb(':memory:');
    runMigrations(db);
    db.prepare(
      "INSERT INTO operators (id, store_id, phone, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run('op1', 'store1', '13800001111', '店主', 'owner', Date.now());

    vi.spyOn(console, 'log').mockImplementation(() => {});
    app = buildAuthRouter(db, 'test-secret', { });
  });

  it('rejects unknown phone', async () => {
    const res = await app.request('/code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '13800002222' }),
    });
    expect(res.status).toBe(403);
  });

  it('issues code for known phone', async () => {
    const res = await app.request('/code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '13800001111' }),
    });
    expect(res.status).toBe(200);
    const row = db.prepare('SELECT code FROM sms_codes WHERE phone=?').get('13800001111') as any;
    expect(row.code).toMatch(/^\d{6}$/);
  });

  it('exchanges code for token', async () => {
    await app.request('/code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '13800001111' }),
    });
    const row = db.prepare('SELECT code FROM sms_codes WHERE phone=?').get('13800001111') as any;

    const res = await app.request('/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '13800001111', code: row.code }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeTruthy();
    expect(body.operator.name).toBe('店主');
  });

  it('rejects wrong code', async () => {
    await app.request('/code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '13800001111' }),
    });
    const res = await app.request('/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '13800001111', code: '000000' }),
    });
    expect(res.status).toBe(401);
  });
});
