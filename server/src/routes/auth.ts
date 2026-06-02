import { Hono } from 'hono';
import { z } from 'zod';
import type { DB } from '../db.js';
import { sendVerificationCode } from '../services/sms.js';
import { signToken } from '../services/auth.js';

const phoneSchema = z.object({ phone: z.string().regex(/^1[3-9]\d{9}$/) });
const verifySchema = phoneSchema.extend({ code: z.string().regex(/^\d{6}$/) });

function genCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

interface SmsConfig {
  ALIYUN_SMS_ACCESS_KEY?: string;
  ALIYUN_SMS_SECRET?: string;
  ALIYUN_SMS_SIGN?: string;
}

export function buildAuthRouter(db: DB, jwtSecret: string, smsConfig: SmsConfig) {
  const app = new Hono();

  app.post('/code', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = phoneSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'bad_phone' }, 400);

    const op = db.prepare(
      'SELECT id, store_id FROM operators WHERE phone=?',
    ).get(parsed.data.phone) as any;
    if (!op) return c.json({ error: 'not_authorized' }, 403);

    const code = genCode();
    const expiresAt = Date.now() + 5 * 60_000;

    db.prepare(
      `INSERT INTO sms_codes (phone, code, expires_at, attempts)
       VALUES (?, ?, ?, 0)
       ON CONFLICT(phone) DO UPDATE SET code=excluded.code, expires_at=excluded.expires_at, attempts=0`,
    ).run(parsed.data.phone, code, expiresAt);

    await sendVerificationCode(parsed.data.phone, code, smsConfig);
    return c.json({ ok: true });
  });

  app.post('/verify', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'bad_request' }, 400);

    const row = db.prepare('SELECT * FROM sms_codes WHERE phone=?').get(parsed.data.phone) as any;
    if (!row) return c.json({ error: 'no_code' }, 401);
    if (Date.now() > row.expires_at) return c.json({ error: 'code_expired' }, 401);
    if (row.attempts >= 5) return c.json({ error: 'too_many_attempts' }, 429);

    if (row.code !== parsed.data.code) {
      db.prepare('UPDATE sms_codes SET attempts=attempts+1 WHERE phone=?').run(parsed.data.phone);
      return c.json({ error: 'wrong_code' }, 401);
    }

    db.prepare('DELETE FROM sms_codes WHERE phone=?').run(parsed.data.phone);

    const op = db.prepare(
      'SELECT id, store_id, name, role FROM operators WHERE phone=?',
    ).get(parsed.data.phone) as any;

    db.prepare('UPDATE operators SET last_login_at=? WHERE id=?').run(Date.now(), op.id);

    const token = await signToken({ operatorId: op.id, storeId: op.store_id }, jwtSecret);
    return c.json({
      token,
      operator: { id: op.id, name: op.name, role: op.role, storeId: op.store_id },
    });
  });

  // Dev-only: phone-only login (no SMS code). Disabled in production.
  app.post('/dev-login', async (c) => {
    if (process.env.NODE_ENV === 'production') {
      return c.json({ error: 'not_available' }, 404);
    }
    const body = await c.req.json().catch(() => ({}));
    const parsed = phoneSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'bad_phone' }, 400);

    const op = db.prepare(
      'SELECT id, store_id, name, role FROM operators WHERE phone=?',
    ).get(parsed.data.phone) as any;
    if (!op) return c.json({ error: 'not_authorized' }, 403);

    db.prepare('UPDATE operators SET last_login_at=? WHERE id=?').run(Date.now(), op.id);

    const token = await signToken({ operatorId: op.id, storeId: op.store_id }, jwtSecret);
    return c.json({
      token,
      operator: { id: op.id, name: op.name, role: op.role, storeId: op.store_id },
    });
  });

  return app;
}
