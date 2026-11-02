'use client';

import type { ReactNode } from 'react';
import { QueryProvider } from './query-provider';
import { ThemeProvider } from './theme-provider';
import { AuthInitializer } from './auth-initializer';
import { Toaster } from 'react-hot-toast';
import { JobWatcher } from '@/components/jobs/JobWatcher';

/** `nonce`: the CSP nonce of this request (proxy.ts), for the inline theme script */
export function AppProviders({ children, nonce }: { children: ReactNode; nonce?: string }) {
  return (
    <QueryProvider>
      <ThemeProvider nonce={nonce}>
        <AuthInitializer>{children}</AuthInitializer>
        <JobWatcher />
        <Toaster
          position="top-right"
          containerStyle={{ top: 'calc(var(--header-height) + 12px)' }}
          toastOptions={{
            duration: 3000,
            style: { borderRadius: '8px', background: '#333', color: '#fff' },
          }}
        />
      </ThemeProvider>
    </QueryProvider>
  );
}
