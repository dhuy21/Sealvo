import './load-root-env';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  // Root layout sets `instant = false` (CSP nonce, per-request render). Protected
  // pages stay out of the server tree until the client session is ready, so the
  // default check reports those layouts as dropped. Validate only segments that
  // opt in with `instant`.
  experimental: {
    instantInsights: {
      validationLevel: 'manual-warning',
    },
  },
  turbopack: {
    rules: {
      '*.css': {
        // `as: '*.css'` would turn CSS Modules into global CSS
        condition: { not: { path: '*.module.css' } },
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
