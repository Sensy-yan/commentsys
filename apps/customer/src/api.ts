const BASE = '/api';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  startSession: (storeId: string) =>
    http<{ sessionId: string }>('/customer/sessions', {
      method: 'POST',
      body: JSON.stringify({ storeId, isWeChat: /MicroMessenger/i.test(navigator.userAgent) }),
    }),
};
