'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';
import { useAuthStore, type User } from '@/stores/auth.store';
import { cx } from '@/lib/css-module';
import styles from '@/styles/auth.module.css';

type Status = { type: 'success' | 'error'; message: string };

const INVALID_TOKEN: Status = {
  type: 'error',
  message: "Le jeton de vérification de l'email n'est pas valide",
};

function VerifyEmailStatus() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [result, setResult] = useState<Status | null>(null);
  // Tokens are single-use: StrictMode's second effect run must not send another request
  const requested = useRef(false);

  useEffect(() => {
    if (!token || requested.current) return;
    requested.current = true;
    api
      .post<{ message: string }>('/auth/verify-email', { token })
      .then((res) => setResult({ type: 'success', message: res.data.message }))
      .catch((err: unknown) =>
        setResult({
          type: 'error',
          message: getApiErrorMessage(err, 'Une erreur est survenue. Veuillez réessayer plus tard.'),
        }),
      );
  }, [token]);

  // An email change only lands in the DB here: a signed-in user's store still holds the old address.
  // Waits for AuthInitializer, whose own /auth/me may have run before the verification.
  const isReady = useAuthStore((s) => s.isReady);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);
  const userRefreshed = useRef(false);
  const verified = result?.type === 'success';

  useEffect(() => {
    if (!verified || !isReady || !isAuthenticated || userRefreshed.current) return;
    userRefreshed.current = true;
    api
      .get<User>('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => {});
  }, [verified, isReady, isAuthenticated, setUser]);

  const status = token ? result : INVALID_TOKEN;

  return (
    <div className={cx(styles, 'page', 'auth-page')}>
      <div className={styles['auth-container']}>
        <div className={styles['auth-header']}>
          <div className={styles['logo-icon']}>
            <i className="fas fa-envelope" />
          </div>
          <h1>Vérification de l&apos;email</h1>
          {!status && <p className={styles['auth-subtitle']}>Vérification en cours...</p>}
        </div>

        {status && (
          <div className={cx(styles, 'alert', `alert-${status.type}`)}>
            <i className={`fas fa-${status.type === 'success' ? 'check-circle' : 'exclamation-circle'}`} />
            {status.message}
          </div>
        )}

        <div className={styles['auth-footer']}>
          <Link href="/login" className={styles['auth-link']}>
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailStatus />
    </Suspense>
  );
}
