const API_BASE = "https://smm-admin-panel-production.up.railway.app";

function getToken() {
  return localStorage.getItem("aloo_token");
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseError(res) {
  try {
    const data = await res.json();
    return data?.message || "Xatolik yuz berdi";
  } catch {
    return "Xatolik yuz berdi";
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
    const message = await parseError(res);

    if (res.status === 401) {
      localStorage.removeItem("aloo_token");
      localStorage.removeItem("aloo_user");
    }

    throw new Error(message);
  }

  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return res.json();
  }

  return res.blob();
}

export function saveAuth(data) {
  if (data?.token) {
    localStorage.setItem("aloo_token", data.token);
  }
  if (data?.user) {
    localStorage.setItem("aloo_user", JSON.stringify(data.user));
  }
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

export const api = {
  login: async (payload) => {
    const data = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    saveAuth(data);
    return data;
  },

  me: () => request("/api/auth/me"),

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

  list: (entity) => request(`/api/${entity}`),

  getOne: (entity, id) => request(`/api/${entity}/${id}`),

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

  recalcBonus: (payload) =>
    request("/api/bonus/recalculate", {
      method: "POST",
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

export { API_BASE };
