'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useVerifyEmail } from '@/hooks/use-auth';
import { getApiErrorMessage } from '@/lib/api-error';
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
  const { data, error } = useVerifyEmail(token);

  const result: Status | null = data
    ? { type: 'success', message: data.message }
    : error
      ? {
          type: 'error',
          message: getApiErrorMessage(
            error,
            'Une erreur est survenue. Veuillez réessayer plus tard.',
          ),
        }
      : null;
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
            <i
              className={`fas fa-${status.type === 'success' ? 'check-circle' : 'exclamation-circle'}`}
            />
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
