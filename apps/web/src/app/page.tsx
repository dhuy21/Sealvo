'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

export default function Home() {
  const router = useRouter();
  const isReady = useAuthStore((s) => s.isReady);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isReady) return;
    router.replace(isAuthenticated ? '/dashboard' : '/login');
  }, [isReady, isAuthenticated, router]);

  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <i className="fas fa-spinner fa-spin text-2xl" aria-label="Loading" />
    </div>
  );
}
