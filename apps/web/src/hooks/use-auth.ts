import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore, type User } from '@/stores/auth.store';

interface MessageResponse {
  message: string;
}

interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  avatar: number;
}

/** Message of POST /auth/login when the account's email is not verified yet. */
export const UNVERIFIED_ACCOUNT_MESSAGE = "Votre compte n'est pas vérifié";

/** GET /auth/me. Pass `accessToken` when the store does not hold it yet. */
export async function fetchMe(accessToken?: string): Promise<User> {
  const { data } = await api.get<User>(
    '/auth/me',
    accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  );
  return data;
}

/** Logs in, then stores the user and the access token. */
export function useLogin() {
  const login = useAuthStore((s) => s.login);
  return useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const { data } = await api.post<{ accessToken: string }>('/auth/login', credentials);
      return { user: await fetchMe(data.accessToken), accessToken: data.accessToken };
    },
    onSuccess: ({ user, accessToken }) => login(user, accessToken),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const { data } = await api.post<MessageResponse>('/auth/register', payload);
      return data;
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data } = await api.post<MessageResponse>('/auth/forgot-password', { email });
      return data;
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (payload: { token: string; password: string }) => {
      const { data } = await api.post<MessageResponse>('/auth/reset-password', payload);
      return data;
    },
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: async (username: string) => {
      const { data } = await api.post<MessageResponse>('/auth/resend-verification', { username });
      return data;
    },
  });
}

/**
 * Verifies `token` once on mount, then refreshes a signed-in user: an email change only lands
 * in the DB here, so the store still holds the old address.
 */
export function useVerifyEmail(token: string | null) {
  const { mutate, data, error, isSuccess } = useMutation({
    mutationFn: async (verificationToken: string) => {
      const { data } = await api.post<MessageResponse>('/auth/verify-email', {
        token: verificationToken,
      });
      return data;
    },
  });
  // Tokens are single-use: StrictMode's second effect run must not send another request
  const requested = useRef(false);

  useEffect(() => {
    if (!token || requested.current) return;
    requested.current = true;
    mutate(token);
  }, [token, mutate]);

  // Waits for AuthInitializer, whose own /auth/me may have run before the verification
  const isReady = useAuthStore((s) => s.isReady);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);
  const userRefreshed = useRef(false);

  useEffect(() => {
    if (!isSuccess || !isReady || !isAuthenticated || userRefreshed.current) return;
    userRefreshed.current = true;
    fetchMe()
      .then(setUser)
      .catch(() => {});
  }, [isSuccess, isReady, isAuthenticated, setUser]);

  return { data, error };
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    // Full reload instead of logout() + router.push: clearing the store while a protected page
    // is mounted makes AuthGuard redirect to /login?redirect=… before the push lands.
    // The reload also drops all in-memory auth and query state.
    onSuccess: () => window.location.assign('/'),
    // The refresh cookie may still be valid: reloading would silently sign the user back in
    onError: () => toast.error('La déconnexion a échoué. Réessayez.'),
  });
}
