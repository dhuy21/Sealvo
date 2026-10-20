import { connection } from 'next/server';
import { serverApiUrl } from '@/env';

/** The Google link of the login and register pages: a plain href, valid before hydration, while the API URL is only known at runtime */
export async function GET() {
  await connection();
  return Response.redirect(`${serverApiUrl()}/auth/google`, 307);
}
