// The only place that reads the web app's environment. Nothing is inlined at build time, so one image
// serves every environment: the server reads API_URL when it runs and hands it to the browser through
// /env.js, which the root layout loads before any app code.

const DEV_API_URL = 'http://localhost:3001';

declare global {
  interface Window {
    __SEALVO_ENV__?: { apiUrl: string };
  }
}

/** Server side. In production a missing API_URL fails loudly instead of sending users to localhost. */
export function serverApiUrl(): string {
  const value = process.env.API_URL || (process.env.NODE_ENV === 'production' ? '' : DEV_API_URL);
  if (!/^https?:\/\/[^/\s]+/.test(value)) {
    throw new Error(`API_URL must be an http(s) URL, got "${value}"`);
  }
  return value;
}

/** Browser side: the value written by /env.js. */
export function apiUrl(): string {
  if (typeof window === 'undefined') return serverApiUrl();
  const value = window.__SEALVO_ENV__?.apiUrl;
  if (value) return value;
  // In production a failed /env.js must surface as an error, not as calls to the developer's machine
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Configuration indisponible : rechargez la page.');
  }
  return DEV_API_URL;
}
