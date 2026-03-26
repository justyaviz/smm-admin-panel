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

  changePassword: (payload) =>
    request("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  dashboard: () => request("/api/dashboard/summary"),

  kpi: {
    summary: () => request("/api/kpi/summary"),
    employees: () => request("/api/kpi/employees"),
    branches: () => request("/api/kpi/branches"),
    contentTypes: () => request("/api/kpi/content-types")
  },

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

  contentByMonth: (month) => request(`/api/content?month=${month}`),

  createContentPlan: (payload) =>
    request("/api/content", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  updateContentPlan: (id, payload) =>
    request(`/api/content/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),

  deleteContentPlan: (id) =>
    request(`/api/content/${id}`, {
      method: "DELETE"
    }),

  uploadFile: (file) => {
    const fd = new FormData();
    fd.append("file", file);

    return request("/api/uploads", {
      method: "POST",
      body: fd
    });
  },

  recalcBonus: () =>
    request("/api/bonuses/recalculate", {
      method: "POST"
    }),

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
    resetPassword: (id) =>
      request(`/api/users/${id}/reset-password`, {
        method: "POST"
      }),
    toggleActive: (id) =>
      request(`/api/users/${id}/toggle-active`, {
        method: "POST"
      })
  },

    updateProfile: (payload) =>
    request("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify(payload)
    }),

  exportFile: async (path, fileName) => {
    const blob = await request(path);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
};
