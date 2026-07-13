const runtimeApiUrl = typeof window !== 'undefined' ? window.__ALOOSMM_CONFIG__?.API_URL : '';
const API_URL = (runtimeApiUrl || import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export async function apiRequest(path, options = {}) {
  const requestUrl = API_URL ? `${API_URL}${path}` : path;
  const response = await fetch(requestUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || 'Server bilan aloqa xatosi.');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
