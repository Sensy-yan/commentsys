import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openDb, runMigrations } from '../../src/db.js';
import { buildCustomerRouter } from '../../src/routes/customer.js';

describe('review generation integration', () => {
  let app: ReturnType<typeof buildCustomerRouter>;
  let sessionId: string;

  beforeEach(async () => {
    process.env.DEEPSEEK_API_KEY = 'fake-key';
    const db = openDb(':memory:');
    runMigrations(db);
    app = buildCustomerRouter(db);
    const r = await app.request('/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: 's' }),
    });
    sessionId = (await r.json()).sessionId;
    await app.request(`/sessions/${sessionId}/rating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 5 }),
    });
  });

  it('returns AI text when LLM succeeds', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        choices: [{ message: { content: '今天来这家做了头皮检测，体验很好。' } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );

    const res = await app.request('/reviews/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId, platform: 'dianping', tags: ['头皮检测'], technician: '小王',
      }),
    });

    const body = await res.json();
    expect(body.source).toBe('ai');
    expect(body.text).toContain('头皮');
  });

  it('falls back to template when LLM fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('boom'));

    const res = await app.request('/reviews/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId, platform: 'dianping', tags: ['头皮检测'], technician: '小王',
      }),
    });

    const body = await res.json();
    expect(body.source).toBe('template');
    expect(body.text.length).toBeGreaterThan(20);
  });

  it('falls back to template when API key missing', async () => {
    delete process.env.DEEPSEEK_API_KEY;
    const res = await app.request('/reviews/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId, platform: 'dianping', tags: [], technician: '',
      }),
    });
    const body = await res.json();
    expect(body.source).toBe('template');
  });
});
