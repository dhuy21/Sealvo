import api from '@/lib/api';
import type { User } from '@/stores/auth.store';

/** GET /auth/me. Pass `accessToken` when the store does not hold it yet. */
export async function fetchMe(accessToken?: string): Promise<User> {
  const { data } = await api.get<User>(
    '/auth/me',
    accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  );
  return data;
}
