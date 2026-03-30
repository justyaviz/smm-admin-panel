import * as SecureStore from "expo-secure-store";

export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE || "http://localhost:8080";

const TOKEN_KEY = "aloo_mobile_token";
const USER_KEY = "aloo_mobile_user";

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

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function request(path, options = {}) {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const response = await fetch(buildUrl(path, options.query), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const data = await parseJsonSafe(response);
    throw new Error(data.message || "So'rov bajarilmadi");
  }

  return parseJsonSafe(response);
}

export const authStore = {
  async restore() {
    const [token, userRaw] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(USER_KEY)
    ]);

    let user = null;
    if (userRaw) {
      try {
        user = JSON.parse(userRaw);
      } catch {
        user = null;
      }
    }

    return { token, user };
  },

  async save(token, user) {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(user || null))
    ]);
  },

  async clear() {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY)
    ]);
  }
};

export const api = {
  async login(payload) {
    const data = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (data?.token) {
      await authStore.save(data.token, data.user || null);
    }

    return data;
  },

  async me() {
    const data = await request("/api/auth/me");
    if (data?.user) {
      const session = await authStore.restore();
      await authStore.save(session.token, data.user);
    }
    return data;
  },

  dashboard() {
    return request("/api/dashboard/summary");
  },

  list(entityOrPath, query = null) {
    return request(entityOrPath.startsWith("/") ? entityOrPath : `/api/${entityOrPath}`, {
      query
    });
  },

  settings: {
    get() {
      return request("/api/settings");
    }
  },

  updateProfile(payload) {
    return request("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },

  changePassword(payload) {
    return request("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }
};
