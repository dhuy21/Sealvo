import { connection } from 'next/server';
import { serverApiUrl } from '@/env';

/** The login and register pages are prerendered, so their Google link cannot hold the runtime API URL */
export async function GET() {
  await connection();
  return Response.redirect(`${serverApiUrl()}/auth/google`, 307);
}
