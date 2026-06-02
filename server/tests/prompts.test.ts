import { describe, it, expect } from 'vitest';
import { buildPrompt } from '../src/prompts/index.js';

const base = { rating: 5, tags: ['头皮检测', '防脱护理'], technician: '小王' };

describe('prompt builders', () => {
  it('dianping prompt mentions length and forbidden words', () => {
    const { system, user } = buildPrompt({ ...base, platform: 'dianping' });
    expect(system).toMatch(/200/);
    expect(system).toMatch(/避免|不要使用/);
    expect(user).toContain('小王');
    expect(user).toContain('头皮检测');
  });

  it('douyin prompt enforces shorter length', () => {
    const { system } = buildPrompt({ ...base, platform: 'douyin' });
    expect(system).toMatch(/150|80/);
  });

  it('xiaohongshu prompt allows emoji', () => {
    const { system } = buildPrompt({ ...base, platform: 'xiaohongshu' });
    expect(system).toMatch(/emoji/i);
  });

  it('meituan prompt mirrors dianping with own length', () => {
    const { system } = buildPrompt({ ...base, platform: 'meituan' });
    expect(system).toMatch(/180|250/);
  });

  it('inserts random variants for anti-dedup', () => {
    const a = buildPrompt({ ...base, platform: 'dianping' });
    const b = buildPrompt({ ...base, platform: 'dianping' });
    expect([a.user, b.user]).not.toEqual([a.user, a.user]);
  });
});
