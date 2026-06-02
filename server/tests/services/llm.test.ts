import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateReview, type GenerateInput } from '../../src/services/llm.js';

describe('generateReview', () => {
  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('calls DeepSeek with system prompt and returns text', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        choices: [{ message: { content: '今天来这家店做了头皮检测，效果很好。' } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );

    const input: GenerateInput = {
      platform: 'dianping',
      rating: 5, tags: ['头皮检测'], technician: '小王',
    };
    const out = await generateReview(input, 'fake-key');

    expect(out.text).toContain('头皮');
    expect(fetchMock).toHaveBeenCalledOnce();
    const call = fetchMock.mock.calls[0];
    const body = JSON.parse(call[1]!.body as string);
    expect(body.model).toBeDefined();
    expect(body.messages[0].role).toBe('system');
  });

  it('throws on non-2xx', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('rate limited', { status: 429 }),
    );
    await expect(
      generateReview({ platform: 'dianping', rating: 5, tags: [], technician: '' }, 'k'),
    ).rejects.toThrow();
  });

  it('rejects empty completion', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: '' } }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    await expect(
      generateReview({ platform: 'dianping', rating: 5, tags: [], technician: '' }, 'k'),
    ).rejects.toThrow();
  });
});
