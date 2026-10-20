import { NextResponse, type NextRequest } from 'next/server';
import { serverApiUrl } from '@/env';

// Ported from the old helmet config (src/app/middleware/security.js). Set here rather than in
// next.config.ts, whose headers are frozen at build time: connect-src and HSTS depend on the runtime API_URL.
// Next.js reads the nonce from the request's CSP and adds it to its scripts: this needs every page
// rendered per request (root layout: `instant = false` + `headers()`).
function contentSecurityPolicy(apiUrl: string | null, nonce: string): string {
  return [
    "default-src 'self'",
    // Scripts loaded by a nonced script (the Next.js chunks) are trusted; browsers then ignore 'self'
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // React `style` attributes cannot carry a nonce, and a nonce would make browsers ignore 'unsafe-inline'
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: blob:",
    apiUrl ? `connect-src 'self' ${new URL(apiUrl).origin}` : "connect-src 'self'",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "frame-src 'self'",
    "child-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    ...(isHttps(apiUrl) ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

function staticSecurityHeaders(apiUrl: string | null): [string, string][] {
  return [
    [
      'Permissions-Policy',
      'camera=(), geolocation=(), payment=(), usb=(), interest-cohort=(), browsing-topics=(), microphone=(self), autoplay=(self)',
    ],
    ['Referrer-Policy', 'strict-origin-when-cross-origin'],
    ['Cross-Origin-Opener-Policy', 'same-origin'],
    ['X-Frame-Options', 'DENY'],
    ['X-Content-Type-Options', 'nosniff'],
    ['X-DNS-Prefetch-Control', 'off'],
    ['Origin-Agent-Cluster', '?1'],
    ['X-Permitted-Cross-Domain-Policies', 'none'],
    ...(isHttps(apiUrl)
      ? [
          ['Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload'] as [
            string,
            string,
          ],
        ]
      : []),
  ];
}

const isHttps = (apiUrl: string | null) => apiUrl?.startsWith('https://') ?? false;

/** A missing or invalid API_URL must not take every page down: /health reports it (503) */
function runtimeApiUrl(): string | null {
  try {
    return serverApiUrl();
  } catch (error) {
    console.error(`Security headers without the API origin: ${(error as Error).message}`);
    return null;
  }
}

let apiUrl: string | null | undefined;
let securityHeaders: [string, string][] | undefined;

export function proxy(request: NextRequest) {
  // `next dev` needs eval() for Fast Refresh, so the policy only applies to production builds
  if (process.env.NODE_ENV !== 'production') return NextResponse.next();

  if (apiUrl === undefined) apiUrl = runtimeApiUrl();
  securityHeaders ??= staticSecurityHeaders(apiUrl);

  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');
  const csp = contentSecurityPolicy(apiUrl, nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  for (const [key, value] of securityHeaders) response.headers.set(key, value);
  return response;
}
