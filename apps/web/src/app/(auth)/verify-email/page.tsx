'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';
import '@/styles/auth.css';

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

  const status = token ? result : INVALID_TOKEN;

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="logo-icon">
            <i className="fas fa-envelope" />
          </div>
          <h1>Vérification de l&apos;email</h1>
          {!status && <p className="auth-subtitle">Vérification en cours...</p>}
        </div>

        {status && (
          <div className={`alert alert-${status.type}`}>
            <i className={`fas fa-${status.type === 'success' ? 'check-circle' : 'exclamation-circle'}`} />
            {status.message}
          </div>
        )}

        <div className="auth-footer">
          <Link href="/login" className="auth-link">
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
