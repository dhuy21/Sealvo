import axios from 'axios';
import { useAuthStore } from '@/stores/auth.store';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  withCredentials: true, // send refresh cookie automatically
});

// ── Request interceptor: attach Bearer token ──
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: 401 → refresh → retry ──
let refreshPromise: Promise<string | null> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh once per request, and not on auth endpoints
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.startsWith('/auth/')
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // Deduplicate concurrent refresh calls
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }

    const newToken = await refreshPromise;
    if (!newToken) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    originalRequest.headers.Authorization = `Bearer ${newToken}`;
    return api(originalRequest);
  },
);

export async function refreshAccessToken(): Promise<string | null> {
  try {
    const { data } = await axios.post<{ accessToken: string }>(
      `${api.defaults.baseURL}/auth/refresh`,
      null,
      { withCredentials: true },
    );
    useAuthStore.getState().setAccessToken(data.accessToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

export default api;
