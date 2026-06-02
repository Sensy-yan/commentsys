import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openDb, runMigrations } from '../../src/db.js';
import { buildCustomerRouter } from '../../src/routes/customer.js';

describe('complaint creation triggers webhook', () => {
  let app: ReturnType<typeof buildCustomerRouter>;
  let sessionId: string;

  beforeEach(async () => {
    process.env.WECOM_WEBHOOK_URL = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test';
    vi.restoreAllMocks();
    const db = openDb(':memory:');
    runMigrations(db);
    app = buildCustomerRouter(db);
    const r = await app.request('/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: 's1' }),
    });
    sessionId = (await r.json()).sessionId;
    await app.request(`/sessions/${sessionId}/rating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 2 }),
    });
  });

  it('calls fetch when complaint is submitted', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{}', { status: 200 }),
    );
    await app.request('/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message: 'test' }),
    });
    // 等待异步触发
    await new Promise((r) => setTimeout(r, 50));
    expect(fetchMock).toHaveBeenCalled();
  });
});
