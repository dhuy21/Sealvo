'use client';

import { useEffect, type ReactNode } from 'react';
import { restoreSession } from '@/lib/restore-session';
import { useAuthStore } from '@/stores/auth.store';

/** While the API cannot answer, guarded pages wait (spinner) instead of sending to /login */
const RETRY_DELAYS_MS = [2_000, 5_000, 10_000, 30_000];

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
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function restore(attempt: number) {
      const session = await restoreSession();
      if (cancelled) return;
      // Logged in from the login page meanwhile: nothing to restore
      if (useAuthStore.getState().isAuthenticated) return setReady();

      if (session.status === 'unreachable') {
        const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
        timer = setTimeout(() => void restore(attempt + 1), delay);
        return;
      }
      if (session.status === 'restored') login(session.user, session.token);
      else logout();
      setReady();
    }

    void restore(0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [login, logout, setReady]);

  return children;
}
