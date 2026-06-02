import type { MiddlewareHandler } from 'hono';
import { verifyToken } from '../services/auth.js';

export function authMiddleware(secret: string): MiddlewareHandler {
  return async (c, next) => {
    const auth = c.req.header('authorization');
    if (!auth?.startsWith('Bearer ')) return c.json({ error: 'unauthorized' }, 401);

    const token = auth.slice('Bearer '.length);
    try {
      const claims = await verifyToken(token, secret);
      c.set('claims' as any, claims);
      await next();
    } catch {
      return c.json({ error: 'unauthorized' }, 401);
    }
  };
}
