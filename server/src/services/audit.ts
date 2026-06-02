import { randomUUID } from 'node:crypto';
import type { DB } from '../db.js';

interface LogInput {
  operatorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: unknown;
}

export function logAction(db: DB, input: LogInput): void {
  db.prepare(
    `INSERT INTO audit_logs (id, operator_id, action, target_type, target_id, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    randomUUID(),
    input.operatorId,
    input.action,
    input.targetType ?? null,
    input.targetId ?? null,
    input.details ? JSON.stringify(input.details) : null,
    Date.now(),
  );
}
