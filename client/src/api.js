export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://smm-admin-panel-back-production.up.railway.app";

function authHeaders() {
  const token = localStorage.getItem("aloo_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function clearAuth() {
  localStorage.removeItem("aloo_token");
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem("aloo_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveAuth(data) {
  if (data?.token) {
    localStorage.setItem("aloo_token", data.token);
  }
  if (data?.user) {
    localStorage.setItem("aloo_user", JSON.stringify(data.user));
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...authHeaders(),
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Xatolik yuz berdi");
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.blob();
}

export const api = {
  login: async (payload) => {
    const res = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    saveAuth(res);
    return res;
  },

  me: () => request("/api/auth/me"),

  dashboard: () => request("/api/dashboard/summary"),

  settings: {
    get: () => request("/api/settings"),
    update: (payload) =>
      request("/api/settings", {
        method: "PUT",
        body: JSON.stringify(payload)
      })
  },

  list: (entity) => request(`/api/${entity}`),

  create: (entity, payload) =>
    request(`/api/${entity}`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  update: (entity, id, payload) =>
    request(`/api/${entity}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),

  remove: (entity, id) =>
    request(`/api/${entity}/${id}`, {
      method: "DELETE"
    }),

  upload: (formData) =>
    request("/api/uploads", {
      method: "POST",
      body: formData
    }),

  recalcBonus: () =>
    request("/api/bonuses/recalculate", {
      method: "POST"
    })
};
