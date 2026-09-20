import axios from "axios";
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
} from "./tokenStorage";

// "/api/v1" only resolves to the real backend in dev, because vite.config.ts
// proxies "/api" to localhost:3000. That proxy doesn't exist once this is
// built and hosted -- a relative path then just hits the frontend's own
// static host and 404s. VITE_API_URL lets a real deployment point this at
// wherever the backend actually lives; leaving it unset keeps today's dev
// behavior exactly as it was.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api/v1",
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

let refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url = error.config?.url || "";

    const isAuthEndpoint =
      url.includes("/auth/login") || url.includes("/auth/refresh");

    // Don't redirect if already on login page or if it's the refresh/login endpoints
    if (status === 401 && !isAuthEndpoint && !original._retry) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = api
            .post("/auth/refresh")
            .then((res) => {
              setAccessToken(res.data.accessToken);
              return res.data.accessToken;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }
        const newToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        clearAccessToken();
      }
      // window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;
