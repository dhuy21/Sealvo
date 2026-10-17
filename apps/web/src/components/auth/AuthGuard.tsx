'use client';

import { Suspense, useEffect, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

export function AuthGuard({ children }: { children: ReactNode }) {
  const isReady = useAuthStore((s) => s.isReady);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isReady) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <i className="fas fa-spinner fa-spin text-2xl" aria-label="Loading" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // useSearchParams needs a Suspense boundary; keeping it here leaves the guarded pages unsuspended
    return (
      <Suspense>
        <RedirectToLogin />
      </Suspense>
    );
  }

  return children;
}

/** Back to the current URL, query included (e.g. `?package=`), once logged in. */
function RedirectToLogin() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    const current = search ? `${pathname}?${search}` : pathname;
    router.replace(`/login?redirect=${encodeURIComponent(current)}`);
  }, [pathname, search, router]);

  return null;
}
