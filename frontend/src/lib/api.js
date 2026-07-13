const runtimeApiUrl = typeof window !== 'undefined' ? window.__ALOOSMM_CONFIG__?.API_URL : '';
const API_URL = (runtimeApiUrl || import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function resolveApiUrl(path) {
  return API_URL ? `${API_URL}${path}` : path;
}

function makeUrl(path) {
  return resolveApiUrl(path);
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(makeUrl(path), {
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

export async function apiDownload(path, options = {}) {
  const response = await fetch(makeUrl(path), {
    ...options,
    headers: { ...(options.headers || {}) },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || 'Faylni yuklab bo‘lmadi.');
  }
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
  let filename = match?.[1] || 'aloo-file';
  if (utfMatch?.[1]) {
    try { filename = decodeURIComponent(utfMatch[1]); } catch { filename = utfMatch[1]; }
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return filename;
}

export function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
