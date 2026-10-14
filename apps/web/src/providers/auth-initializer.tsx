'use client';

import { useEffect, type ReactNode } from 'react';
import api, { refreshAccessToken } from '@/lib/api';
import { useAuthStore, type User } from '@/stores/auth.store';

/**
 * On app load: try POST /auth/refresh (httpOnly cookie, path /auth).
 * Restores the in-memory access token after a full page reload.
 */
export function AuthInitializer({ children }: { children: ReactNode }) {
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const setReady = useAuthStore((s) => s.setReady);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        const token = await refreshAccessToken();
        if (!token) {
          if (!cancelled) logout();
          return;
        }
        const { data } = await api.get<User>('/auth/me');
        if (!cancelled) login(data, token);
      } catch {
        if (!cancelled) logout();
      } finally {
        if (!cancelled) setReady();
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, [login, logout, setReady]);

  return children;
}
