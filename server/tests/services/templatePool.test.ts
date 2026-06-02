import { describe, it, expect } from 'vitest';
import { composeFromPool } from '../../src/services/templatePool.js';

describe('templatePool', () => {
  it('produces text in expected length range for dianping', () => {
    const t = composeFromPool({
      platform: 'dianping',
      rating: 5, tags: ['头皮检测'], technician: '小王',
    });
    expect(t.length).toBeGreaterThanOrEqual(80);
    expect(t.length).toBeLessThanOrEqual(400);
    expect(t).toContain('小王');
  });

  it('produces different content across calls', () => {
    const set = new Set<string>();
    for (let i = 0; i < 10; i++) {
      set.add(composeFromPool({
        platform: 'dianping', rating: 5,
        tags: ['头皮检测'], technician: '小王',
      }));
    }
    expect(set.size).toBeGreaterThan(3);
  });

  it('works for all 4 platforms', () => {
    for (const p of ['dianping', 'meituan', 'douyin', 'xiaohongshu'] as const) {
      const t = composeFromPool({ platform: p, rating: 5, tags: [], technician: '' });
      expect(t.length).toBeGreaterThan(20);
    }
  });
});
