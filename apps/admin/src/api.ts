const BASE = '/api';

interface Stats {
  range: string;
  totalSessions: number;
  ratingBreakdown: Record<string, number>;
  platformJumps: Record<string, number>;
  totalJumps: number;
  pendingComplaints: number;
}

interface Complaint {
  id: string; rating: number; message: string; contact: string | null;
  status: 'pending' | 'handled'; handler_note: string | null;
  created_at: number; handled_at: number | null;
}

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
  getStats: (range: 'today' | 'week' | 'month') =>
    http<Stats>(`/admin/stats?range=${range}`),
  listComplaints: (status: 'pending' | 'handled') =>
    http<{ items: Complaint[] }>(`/admin/complaints?status=${status}`),
  handleComplaint: (id: string, note: string) =>
    http<{ ok: true }>(`/admin/complaints/${id}/handle`, {
      method: 'POST', body: JSON.stringify({ note }),
    }),
};
