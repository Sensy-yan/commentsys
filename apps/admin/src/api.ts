const BASE = '/api';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const res = await fetch(BASE + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  requestCode: (phone: string) =>
    http<{ ok: true }>('/auth/code', {
      method: 'POST', body: JSON.stringify({ phone }),
    }),
  verifyCode: (phone: string, code: string) =>
    http<{ token: string; operator: { id: string; name: string; role: string; storeId: string } }>(
      '/auth/verify', { method: 'POST', body: JSON.stringify({ phone, code }) },
    ),
};
