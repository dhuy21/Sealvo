import axios from 'axios';
import { fetchMe } from '@/hooks/use-auth';
import type { User } from '@/stores/auth.store';
import { renewSession } from './api';

export type RestoredSession =
  | { status: 'restored'; user: User; token: string }
  /** No valid refresh cookie (or no account behind it): logged out */
  | { status: 'ended' }
  /** The API could not answer (deploy, outage, 429): the session may still be valid */
  | { status: 'unreachable' };

const isUnreachable = (error: unknown) => {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  return status === undefined || status === 429 || status >= 500;
};

/** On page load: the refresh cookie gives back an access token, then the user it belongs to */
export async function restoreSession(): Promise<RestoredSession> {
  try {
    // Shared with the 401 interceptor and StrictMode's second run: one rotation, not two
    const result = await renewSession();
    if (result.token === null) return { status: result.sessionEnded ? 'ended' : 'unreachable' };
    return { status: 'restored', user: await fetchMe(), token: result.token };
  } catch (error) {
    return { status: isUnreachable(error) ? 'unreachable' : 'ended' };
  }
}
