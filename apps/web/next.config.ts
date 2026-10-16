import type { NextConfig } from 'next';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const isHttps = apiUrl.startsWith('https://');

// Ported from the old helmet config (src/app/middleware/security.js). Pages are prerendered,
// so per-request nonces are not available: inline scripts need 'unsafe-inline'.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: blob:",
  `connect-src 'self' ${new URL(apiUrl).origin}`,
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-src 'self'",
  "child-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  ...(isHttps ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  {
    key: 'Permissions-Policy',
    value:
      'camera=(), geolocation=(), payment=(), usb=(), interest-cohort=(), browsing-topics=(), microphone=(self), autoplay=(self)',
  },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'Origin-Agent-Cluster', value: '?1' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  ...(isHttps
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' }]
    : []),
];

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
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
  // `next dev` needs eval() for Fast Refresh, so the policy only applies to production builds
  async headers() {
    if (process.env.NODE_ENV !== 'production') return [];
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
