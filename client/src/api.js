const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

function getToken() {
  return localStorage.getItem("token");
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`
    },
    ...options
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Xatolik");
  }

  return res.json();
}

export const api = {
  login: (data) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  me: () => request("/api/auth/me"),

  changePassword: (data) =>
    request("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  /* KPI */
  kpiSummary: () => request("/api/kpi/summary"),
  kpiEmployees: () => request("/api/kpi/employees"),
  kpiBranches: () => request("/api/kpi/branches"),
  kpiContentTypes: () => request("/api/kpi/content-types"),

  /* USERS */
  users: () => request("/api/users"),
  createUser: (d) =>
    request("/api/users", { method: "POST", body: JSON.stringify(d) }),
  updateUser: (id, d) =>
    request(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(d)
    }),
  deleteUser: (id) =>
    request(`/api/users/${id}`, { method: "DELETE" }),
  toggleUser: (id) =>
    request(`/api/users/${id}/toggle-active`, { method: "POST" }),
  resetPassword: (id) =>
    request(`/api/users/${id}/reset-password`, { method: "POST" }),

  /* CONTENT */
  content: () => request("/api/content"),
  createContent: (d) =>
    request("/api/content", { method: "POST", body: JSON.stringify(d) }),
  updateContent: (id, d) =>
    request(`/api/content/${id}`, {
      method: "PUT",
      body: JSON.stringify(d)
    }),
  deleteContent: (id) =>
    request(`/api/content/${id}`, { method: "DELETE" }),

  /* TASKS */
  tasks: () => request("/api/tasks"),
  createTask: (d) =>
    request("/api/tasks", { method: "POST", body: JSON.stringify(d) }),
  updateTask: (id, d) =>
    request(`/api/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(d)
    }),
  deleteTask: (id) =>
    request(`/api/tasks/${id}`, { method: "DELETE" }),

  /* CAMPAIGNS */
  campaigns: () => request("/api/campaigns"),
  createCampaign: (d) =>
    request("/api/campaigns", {
      method: "POST",
      body: JSON.stringify(d)
    }),
  updateCampaign: (id, d) =>
    request(`/api/campaigns/${id}`, {
      method: "PUT",
      body: JSON.stringify(d)
    }),
  deleteCampaign: (id) =>
    request(`/api/campaigns/${id}`, { method: "DELETE" }),

  /* DAILY REPORTS */
  reports: () => request("/api/daily-reports"),
  createReport: (d) =>
    request("/api/daily-reports", {
      method: "POST",
      body: JSON.stringify(d)
    }),
  updateReport: (id, d) =>
    request(`/api/daily-reports/${id}`, {
      method: "PUT",
      body: JSON.stringify(d)
    }),
  deleteReport: (id) =>
    request(`/api/daily-reports/${id}`, { method: "DELETE" }),

  /* BONUS */
  bonusItems: () => request("/api/bonus-items"),
  createBonusItem: (d) =>
    request("/api/bonus-items", {
      method: "POST",
      body: JSON.stringify(d)
    }),
  updateBonusItem: (id, d) =>
    request(`/api/bonus-items/${id}`, {
      method: "PUT",
      body: JSON.stringify(d)
    }),
  deleteBonusItem: (id) =>
    request(`/api/bonus-items/${id}`, { method: "DELETE" }),

  /* UPLOAD */
  uploads: () => request("/api/uploads"),
  uploadFile: async (file) => {
    const form = new FormData();
    form.append("file", file);

    const res = await fetch(`${API_BASE}/api/uploads`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`
      },
      body: form
    });

    return res.json();
  },
  deleteUpload: (id) =>
    request(`/api/uploads/${id}`, { method: "DELETE" }),

  /* NOTIFICATIONS */
  notifications: () => request("/api/notifications"),
  readNotification: (id) =>
    request(`/api/notifications/read/${id}`, { method: "POST" }),
  readAllNotifications: () =>
    request(`/api/notifications/read-all`, { method: "POST" }),

  /* EXPORT */
  exportExcel: (path) =>
    window.open(`${API_BASE}${path}?token=${getToken()}`),

  /* AUDIT */
  audit: () => request("/api/audit-logs")
};
