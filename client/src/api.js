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
