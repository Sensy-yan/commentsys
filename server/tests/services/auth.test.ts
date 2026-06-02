import { describe, it, expect } from 'vitest';
import { signToken, verifyToken } from '../../src/services/auth.js';

describe('auth tokens', () => {
  it('signs and verifies a token', async () => {
    const t = await signToken({ operatorId: 'op1', storeId: 's1' }, 'secret123');
    const claims = await verifyToken(t, 'secret123');
    expect(claims.operatorId).toBe('op1');
    expect(claims.storeId).toBe('s1');
  });

  it('rejects wrong secret', async () => {
    const t = await signToken({ operatorId: 'op1', storeId: 's1' }, 'secret123');
    await expect(verifyToken(t, 'wrong')).rejects.toThrow();
  });
});
