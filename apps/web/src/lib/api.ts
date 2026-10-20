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
  // An explicit header wins: fetchMe passes the token the store does not hold yet
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: 401 → refresh → retry ──
/** sessionEnded: the API rejected the refresh cookie, as opposed to the API being unreachable */
export type RefreshResult = { token: string } | { token: null; sessionEnded: boolean };

let refreshPromise: Promise<RefreshResult> | null = null;

/**
 * Refresh shared by every caller. Logs out only when the refresh cookie is no longer valid: an
 * API outage or a 429 keeps the session, the next request refreshes again.
 */
export async function renewSession(): Promise<RefreshResult> {
  // Deduplicate concurrent refresh calls
  if (!refreshPromise) {
    refreshPromise = refreshAcrossTabs().finally(() => {
      refreshPromise = null;
    });
  }

  const result = await refreshPromise;
  if (result.token === null && result.sessionEnded) useAuthStore.getState().logout();
  return result;
}

/** The new access token, or null (see renewSession) */
export async function renewAccessToken(): Promise<string | null> {
  return (await renewSession()).token;
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
async function refreshAcrossTabs(): Promise<RefreshResult> {
  if (!('locks' in navigator)) return refreshAccessToken();
  return await navigator.locks.request('sealvo-refresh', refreshAccessToken);
}

/** Runs while holding the cross-tab lock: an API that never answers must not block every tab */
const REFRESH_TIMEOUT_MS = 15_000;

async function refreshAccessToken(): Promise<RefreshResult> {
  try {
    const { data } = await axios.post<{ accessToken: string }>(`${apiUrl()}/auth/refresh`, null, {
      withCredentials: true,
      timeout: REFRESH_TIMEOUT_MS,
    });
    useAuthStore.getState().setAccessToken(data.accessToken);
    return { token: data.accessToken };
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    // 403: the API refused this origin (SameOriginGuard), retrying cannot succeed either
    return { token: null, sessionEnded: status === 401 || status === 403 };
  }
}

export default api;
