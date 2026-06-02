import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { authMiddleware } from '../../src/middleware/auth.js';
import { signToken } from '../../src/services/auth.js';

describe('authMiddleware', () => {
  const SECRET = 'test-secret';
  function app() {
    const a = new Hono();
    a.use('*', authMiddleware(SECRET));
    a.get('/me', (c) => c.json(c.get('claims' as any)));
    return a;
  }

  it('rejects missing header', async () => {
    const res = await app().request('/me');
    expect(res.status).toBe(401);
  });

  it('rejects bad token', async () => {
    const res = await app().request('/me', {
      headers: { Authorization: 'Bearer notatoken' },
    });
    expect(res.status).toBe(401);
  });

  it('attaches claims for valid token', async () => {
    const token = await signToken({ operatorId: 'op1', storeId: 's1' }, SECRET);
    const res = await app().request('/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.operatorId).toBe('op1');
  });
});
