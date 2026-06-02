import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, runMigrations } from '../../src/db.js';
import { logAction } from '../../src/services/audit.js';

describe('audit log', () => {
  let db: ReturnType<typeof openDb>;
  beforeEach(() => { db = openDb(':memory:'); runMigrations(db); });

  it('records an action', () => {
    logAction(db, {
      operatorId: 'op1',
      action: 'complaint_handled',
      targetType: 'complaint',
      targetId: 'c1',
      details: { note: 'called' },
    });
    const row = db.prepare('SELECT * FROM audit_logs').get() as any;
    expect(row.operator_id).toBe('op1');
    expect(row.action).toBe('complaint_handled');
    expect(JSON.parse(row.details)).toEqual({ note: 'called' });
  });
});
