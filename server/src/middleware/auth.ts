import type { MiddlewareHandler } from 'hono';
import type { Env, Variables } from '../types.js';
import { verifyToken } from '../services/auth.js';

export const authMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (c, next) => {
  const auth = c.req.header('authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'unauthorized' }, 401);

  const token = auth.slice('Bearer '.length);
  try {
    const claims = await verifyToken(token, c.env.JWT_SECRET);
    c.set('claims', claims);
    await next();
  } catch {
    return c.json({ error: 'unauthorized' }, 401);
  }
};
