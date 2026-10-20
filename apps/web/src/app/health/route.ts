import { connection } from 'next/server';
import { serverApiUrl } from '@/env';

/** Read by the deploy workflow: `version` is the commit the running image was built from */
export async function GET() {
  // GIT_SHA and API_URL are only set in the runtime image: render per request, never at build time
  await connection();
  try {
    serverApiUrl();
  } catch (error) {
    return Response.json({ status: 'unhealthy', error: (error as Error).message }, { status: 503 });
  }
  return Response.json({ status: 'healthy', version: process.env.GIT_SHA ?? 'unknown' });
}
