interface LogInput {
  operatorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: unknown;
}

export async function logAction(db: D1Database, input: LogInput): Promise<void> {
  await db.prepare(
    `INSERT INTO audit_logs (id, operator_id, action, target_type, target_id, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    crypto.randomUUID(),
    input.operatorId,
    input.action,
    input.targetType ?? null,
    input.targetId ?? null,
    input.details ? JSON.stringify(input.details) : null,
    Date.now(),
  ).run();
}
