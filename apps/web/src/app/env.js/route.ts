import { connection } from 'next/server';
import { serverApiUrl } from '@/env';

/** Runtime configuration for the browser, loaded by the root layout before any app code */
export async function GET() {
  // API_URL belongs to the running container, not to the build: render per request
  await connection();
  const body = `window.__SEALVO_ENV__=${JSON.stringify({ apiUrl: serverApiUrl() })};`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
