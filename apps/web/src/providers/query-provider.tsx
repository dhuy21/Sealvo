'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuthStore } from '@/stores/auth.store';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 min — match backend cache TTL
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  // Query keys are not scoped per user: drop all cached data whenever the user changes
  // (login, logout, interceptor-forced logout).
  useEffect(
    () =>
      useAuthStore.subscribe((state, prev) => {
        if (state.user?.id !== prev.user?.id) queryClient.clear();
      }),
    [queryClient],
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
