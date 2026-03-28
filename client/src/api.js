export const API_BASE =
  import.meta.env.VITE_API_BASE || "http://localhost:8080";
export const SOCKET_BASE = API_BASE;

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

function getToken() {
  return localStorage.getItem("aloo_token");
}

export function getAuthToken() {
  return getToken();
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function buildUrl(path, query) {
  const fullPath = path.startsWith("/") ? path : `/api/${path}`;
  const url = new URL(`${API_BASE}${fullPath}`);

  if (query && typeof query === "object") {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const url = buildUrl(path, options.query);

  const res = await fetch(url, {
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

  const ct = res.headers.get("content-type") || "";

  if (ct.includes("application/json")) {
    return res.json();
  }

  return res.blob();
}

export const api = {
  login: async (payload) => {
    const data = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (data?.token) localStorage.setItem("aloo_token", data.token);
    if (data?.user) localStorage.setItem("aloo_user", JSON.stringify(data.user));

    return data;
  },

  me: async () => {
    const data = await request("/api/auth/me");
    if (data?.user) localStorage.setItem("aloo_user", JSON.stringify(data.user));
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

  list: (entityOrPath, query = null) =>
    request(entityOrPath.startsWith("/") ? entityOrPath : `/api/${entityOrPath}`, {
      query
    }),

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

  exportFile: async (path, fileName = "download") => {
    const blob = await request(path);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
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
