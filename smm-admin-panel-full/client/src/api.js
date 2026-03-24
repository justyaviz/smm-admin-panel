const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

async function request(path, options = {}) {
  const token = localStorage.getItem('aloo_token')
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    let message = 'Xatolik yuz berdi'
    try {
      const data = await res.json()
      message = data.message || message
    } catch {}
    throw new Error(message)
  }

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  base: API_BASE,
  login: (phone, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) }),
  me: () => request('/api/auth/me'),
  list: (section) => request(`/api/${section}`),
  create: (section, payload) => request(`/api/${section}`, { method: 'POST', body: JSON.stringify(payload) }),
  update: (section, id, payload) => request(`/api/${section}/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (section, id) => request(`/api/${section}/${id}`, { method: 'DELETE' }),
  getSettings: () => request('/api/settings'),
  saveSettings: (payload) => request('/api/settings', { method: 'PUT', body: JSON.stringify(payload) }),
  stats: () => request('/api/dashboard/stats'),
}
