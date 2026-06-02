import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, runMigrations } from '../../src/db.js';
import { buildComplaintsRouter } from '../../src/routes/complaints.js';
import { signToken } from '../../src/services/auth.js';

const SECRET = 'test';

describe('admin/complaints', () => {
  let app: ReturnType<typeof buildComplaintsRouter>;
  let db: ReturnType<typeof openDb>;
  let token: string;

  beforeEach(async () => {
    db = openDb(':memory:');
    runMigrations(db);
    app = buildComplaintsRouter(db, SECRET);
    token = await signToken({ operatorId: 'op1', storeId: 's1' }, SECRET);

    const now = Date.now();
    db.prepare("INSERT INTO sessions (id, store_id, rating, created_at) VALUES (?, ?, ?, ?)")
      .run('sess1', 's1', 2, now);
    db.prepare(`INSERT INTO complaints (id, session_id, store_id, rating, message, contact, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('c1', 'sess1', 's1', 2, '太轻了', '13800001234', 'pending', now);
  });

  it('lists pending complaints', async () => {
    const res = await app.request('/?status=pending', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].message).toBe('太轻了');
  });

  it('marks a complaint as handled', async () => {
    const res = await app.request('/c1/handle', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: '已电话补救' }),
    });
    expect(res.status).toBe(200);
    const row = db.prepare('SELECT status, handler_id, handler_note FROM complaints WHERE id=?').get('c1') as any;
    expect(row.status).toBe('handled');
    expect(row.handler_id).toBe('op1');
    expect(row.handler_note).toBe('已电话补救');
  });

  it('rejects updates to other stores complaints', async () => {
    db.prepare(`INSERT INTO complaints (id, session_id, store_id, rating, message, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run('c2', 'sess1', 'OTHER', 1, 'x', 'pending', Date.now());
    const res = await app.request('/c2/handle', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: 'x' }),
    });
    expect(res.status).toBe(404);
  });
});
