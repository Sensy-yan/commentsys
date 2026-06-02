import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notifyComplaint } from '../../src/services/notification.js';

describe('notifyComplaint', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('does nothing without webhook', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    await notifyComplaint({
      webhookUrl: '',
      complaintId: 'c1', rating: 2, message: 'x',
      contact: null, adminUrl: 'http://x',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts a markdown message to webhook', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"errcode":0}', { status: 200 }),
    );
    await notifyComplaint({
      webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=abc',
      complaintId: 'c1', rating: 2, message: '太轻',
      contact: '13800001111', adminUrl: 'http://x/complaints',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const body = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    expect(body.msgtype).toBe('markdown');
    expect(body.markdown.content).toContain('太轻');
    expect(body.markdown.content).toContain('13800001111');
  });

  it('handles webhook failure gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
    await expect(notifyComplaint({
      webhookUrl: 'https://x', complaintId: 'c1', rating: 1,
      message: 'x', contact: null, adminUrl: 'http://x',
    })).resolves.toBeUndefined();
  });
});
