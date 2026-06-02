const BASE = '/api/customer';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  startSession: (storeId: string) =>
    http<{ sessionId: string }>('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        storeId,
        isWeChat: /MicroMessenger/i.test(navigator.userAgent),
      }),
    }),

  submitRating: (sessionId: string, rating: number) =>
    http<{ route: 'positive' | 'complaint' }>(`/sessions/${sessionId}/rating`, {
      method: 'POST',
      body: JSON.stringify({ rating }),
    }),

  submitComplaint: (sessionId: string, message: string, contact?: string) =>
    http<{ complaintId: string }>('/complaints', {
      method: 'POST',
      body: JSON.stringify({ sessionId, message, contact }),
    }),
};
