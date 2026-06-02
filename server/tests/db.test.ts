import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, runMigrations } from '../src/db.js';

describe('database', () => {
  let db: ReturnType<typeof openDb>;

  beforeEach(() => {
    db = openDb(':memory:');
    runMigrations(db);
  });

  it('creates all required tables', () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r: any) => r.name);
    expect(tables).toEqual(
      expect.arrayContaining([
        'sessions',
        'reviews',
        'complaints',
        'operators',
        'sms_codes',
        'audit_logs',
        'photos',
        'store_config',
      ]),
    );
  });

  it('inserts and reads a session', () => {
    db.prepare(
      "INSERT INTO sessions (id, store_id, created_at) VALUES (?, ?, ?)",
    ).run('s1', 'store1', Date.now());
    const row = db.prepare("SELECT * FROM sessions WHERE id=?").get('s1') as any;
    expect(row.store_id).toBe('store1');
  });
});
