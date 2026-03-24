export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

function authHeaders() {
  const token = localStorage.getItem('aloo_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...authHeaders(),
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Xatolik yuz berdi');
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.blob();
}

export const api = {
  login: (payload) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/api/auth/me'),
  changePassword: (payload) => request('/api/auth/change-password', { method: 'POST', body: JSON.stringify(payload) }),
  dashboard: () => request('/api/dashboard/summary'),
  settings: {
    get: () => request('/api/settings'),
    update: (payload) => request('/api/settings', { method: 'PUT', body: JSON.stringify(payload) })
  },
  list: (entity) => request(`/api/${entity}`),
  create: (entity, payload) => request(`/api/${entity}`, { method: 'POST', body: JSON.stringify(payload) }),
  update: (entity, id, payload) => request(`/api/${entity}/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (entity, id) => request(`/api/${entity}/${id}`, { method: 'DELETE' }),
  upload: (formData) => request('/api/uploads', { method: 'POST', body: formData }),
  recalcBonus: (payload) => request('/api/bonus/recalculate', { method: 'POST', body: JSON.stringify(payload) }),
  exportFile: async (path, fileName) => {
    const blob = await request(path);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  }
};
