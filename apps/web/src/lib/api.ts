import axios from 'axios';
import { useAuthStore } from '@/stores/auth.store';
import { apiUrl } from '@/env';

const api = axios.create({
  withCredentials: true, // send refresh cookie automatically
});

// ── Request interceptor: attach Bearer token ──
api.interceptors.request.use((config) => {
  config.baseURL = apiUrl();
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: 401 → refresh → retry ──
let refreshPromise: Promise<string | null> | null = null;

/** Refresh after a 401, shared by every caller. Logs out when the refresh cookie is no longer valid. */
export async function renewAccessToken(): Promise<string | null> {
  // Deduplicate concurrent refresh calls
  if (!refreshPromise) {
    refreshPromise = refreshAcrossTabs().finally(() => {
      refreshPromise = null;
    });
  }

  const newToken = await refreshPromise;
  if (!newToken) useAuthStore.getState().logout();
  return newToken;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip refresh on login/register/refresh itself (avoid loops).
    // /auth/logout and /auth/me still refresh so an expired access token can clear the cookie.
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      isAuthRefreshSkip(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const newToken = await renewAccessToken();
    if (!newToken) return Promise.reject(error);

    originalRequest.headers.Authorization = `Bearer ${newToken}`;
    return api(originalRequest);
  },
);

function isAuthRefreshSkip(url?: string): boolean {
  if (!url) return false;
  return /\/auth\/(login|register|refresh)(\?|$)/.test(url);
}

/**
 * Tabs share the refresh cookie: one refresh at a time, so a waiting tab sends the token the
 * previous one just received instead of the rotated one (which the API only accepts for 10 s).
 */
async function refreshAcrossTabs(): Promise<string | null> {
  if (!('locks' in navigator)) return refreshAccessToken();
  return await navigator.locks.request('sealvo-refresh', refreshAccessToken);
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const { data } = await axios.post<{ accessToken: string }>(
      `${apiUrl()}/auth/refresh`,
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
