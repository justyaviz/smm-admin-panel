export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://smm-admin-panel-back-production.up.railway.app";

function authHeaders() {
  const token = localStorage.getItem("aloo_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function clearAuth() {
  localStorage.removeItem("aloo_token");
  localStorage.removeItem("aloo_user");
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
  const isFormData = options.body instanceof FormData;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...authHeaders(),
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Xatolik yuz berdi");
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
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
  list: (entity) => request(`/api/${entity}`)
};
