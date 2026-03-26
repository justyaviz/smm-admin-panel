export const API_BASE =
  import.meta.env.VITE_API_BASE || "http://localhost:8080";

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem("aloo_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem("aloo_token");
  localStorage.removeItem("aloo_user");
}

function authHeaders() {
  const token = localStorage.getItem("aloo_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
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
    const data = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (data?.token) {
      localStorage.setItem("aloo_token", data.token);
    }

    if (data?.user) {
      localStorage.setItem("aloo_user", JSON.stringify(data.user));
    }

    return data;
  },

  me: async () => {
    const data = await request("/api/auth/me");
    if (data?.user) {
      localStorage.setItem("aloo_user", JSON.stringify(data.user));
    }
    return data;
  },

  updateProfile: (payload) =>
    request("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify(payload)
    }),

  changePassword: (payload) =>
    request("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  dashboard: () => request("/api/dashboard/summary"),

  settings: {
    get: () => request("/api/settings"),
    update: (payload) =>
      request("/api/settings", {
        method: "PUT",
        body: JSON.stringify(payload)
      })
  },

  list: (entityOrPath) =>
    request(entityOrPath.startsWith("/") ? entityOrPath : `/api/${entityOrPath}`),

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

  exportFile: async (path, fileName) => {
    const blob = await request(path);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  notifications: {
    read: (id) =>
      request(`/api/notifications/read/${id}`, {
        method: "POST"
      }),
    readAll: () =>
      request("/api/notifications/read-all", {
        method: "POST"
      })
  },

  users: {
    update: (id, payload) =>
      request(`/api/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      }),
    resetPassword: (id) =>
      request(`/api/users/${id}/reset-password`, {
        method: "POST"
      }),
    toggleActive: (id) =>
      request(`/api/users/${id}/toggle-active`, {
        method: "POST"
      })
  }
};
