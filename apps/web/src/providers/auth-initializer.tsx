'use client';

import { useEffect, type ReactNode } from 'react';
import { fetchMe } from '@/hooks/use-auth';
import { renewAccessToken } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

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
        // Shared with the 401 interceptor and StrictMode's second run: one rotation, not two
        const token = await renewAccessToken();
        if (!token) {
          if (!cancelled) logout();
          return;
        }
        const user = await fetchMe();
        if (!cancelled) login(user, token);
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
