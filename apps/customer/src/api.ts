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

  generateReview: (sessionId: string, platform: string, tags: string[], technician: string) =>
    http<{ text: string; source: 'ai' | 'template' | 'stub' }>('/reviews/generate', {
      method: 'POST',
      body: JSON.stringify({ sessionId, platform, tags, technician }),
    }),

  recommendPhotos: (sessionId: string, platform: string) =>
    http<{ items: Array<{ id: string; url: string; type: string }> }>(
      `/photos/recommend?sessionId=${sessionId}&platform=${platform}&limit=5`,
    ),

  getStoreConfig: (storeId: string) =>
    http<{
      name: string;
      platformUrls: Record<string, string>;
      technicians: string[];
      projects: string[];
    }>(`/config/${storeId}`),
};
