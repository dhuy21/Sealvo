'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isReady = useAuthStore((s) => s.isReady);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      const loginUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
      router.replace(loginUrl);
    }
  }, [isReady, isAuthenticated, pathname, router]);

  if (!isReady) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <i className="fas fa-spinner fa-spin text-2xl" aria-label="Loading" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return children;
}
