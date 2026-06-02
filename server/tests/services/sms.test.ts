import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendVerificationCode } from '../../src/services/sms.js';

describe('sms', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('logs code when no API key configured', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ok = await sendVerificationCode('13800001111', '123456', {});
    expect(ok).toBe(true);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('123456'));
  });

  it('calls Aliyun API when configured', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ Code: 'OK' }), { status: 200 }),
    );
    const ok = await sendVerificationCode('13800001111', '888888', {
      ALIYUN_SMS_ACCESS_KEY: 'k', ALIYUN_SMS_SECRET: 's', ALIYUN_SMS_SIGN: 'sign',
    });
    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
