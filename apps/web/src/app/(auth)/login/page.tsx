'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import toast from 'react-hot-toast';
import { API_ERROR_CODES } from '@sealvo/shared';
import { AuthDecor } from '@/components/auth/AuthDecor';
import { useLogin, useResendVerification } from '@/hooks/use-auth';
import { getApiErrorCode, getApiErrorMessage } from '@/lib/api-error';
import { useAuthStore } from '@/stores/auth.store';
import { safeRedirect } from '@/lib/safe-redirect';
import { cx } from '@/lib/css-module';
import styles from '@/styles/auth.module.css';

const loginSchema = z.object({
  username: z.string().min(1, "Nom d'utilisateur requis"),
  password: z.string().min(1, 'Mot de passe requis'),
});

type LoginForm = z.infer<typeof loginSchema>;

const GOOGLE_ERRORS = new Map([
  ['google_no_code', 'No code provided'],
  ['google_failed', 'Authentication failed'],
]);

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useLogin();
  const resend = useResendVerification();
  const isReady = useAuthStore((s) => s.isReady);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [showPassword, setShowPassword] = useState(false);
  const [unverifiedMessage, setUnverifiedMessage] = useState<string | null>(null);
  const googleError = GOOGLE_ERRORS.get(searchParams.get('error') ?? '');

  useEffect(() => {
    if (isReady && isAuthenticated) {
      router.replace(safeRedirect(searchParams.get('redirect')));
    }
  }, [isReady, isAuthenticated, router, searchParams]);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setUnverifiedMessage(null);
    resend.reset();
    try {
      await login.mutateAsync(data);
      // The isAuthenticated effect above navigates
      toast.success('Connexion réussie !');
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, 'Identifiants invalides');
      if (getApiErrorCode(err) === API_ERROR_CODES.ACCOUNT_UNVERIFIED)
        setUnverifiedMessage(message);
      toast.error(message);
    }
  };

  return (
    <div className={cx(styles, 'page', 'auth-page')}>
      <AuthDecor />

      <div className={styles['auth-container']}>
        <div className={styles['auth-header']}>
          <div className={styles['logo-icon']}>
            <i className="fas fa-graduation-cap" />
          </div>
          <h1>Connexion</h1>
          <p className={styles['auth-subtitle']}>
            Connectez-vous pour continuer votre apprentissage
          </p>
        </div>

        {googleError && (
          <div className={cx(styles, 'alert', 'alert-error')}>
            <i className="fas fa-exclamation-circle" />
            {googleError}
          </div>
        )}

        {unverifiedMessage && (
          <>
            <div className={cx(styles, 'alert', 'alert-error')}>
              <i className="fas fa-exclamation-circle" />
              {unverifiedMessage}
            </div>
            <button
              type="button"
              className={cx(styles, 'auth-link', 'link-button')}
              disabled={resend.isPending}
              onClick={() => resend.mutate(getValues('username'))}
            >
              Renvoyer l&apos;email de vérification
            </button>
            {resend.isSuccess && (
              <div className={cx(styles, 'alert', 'alert-success')}>
                <i className="fas fa-check-circle" />
                {resend.data.message}
              </div>
            )}
            {resend.isError && (
              <div className={cx(styles, 'alert', 'alert-error')}>
                <i className="fas fa-exclamation-circle" />
                {getApiErrorMessage(
                  resend.error,
                  'Une erreur est survenue. Veuillez réessayer plus tard.',
                )}
              </div>
            )}
          </>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className={styles['auth-form']}>
          <div className={styles['form-group']} data-delay="100">
            <div className={styles['input-icon-wrapper']}>
              <input
                type="text"
                placeholder="Nom d'utilisateur"
                autoComplete="username"
                {...register('username')}
              />
              <i className={cx(styles, 'input-icon', 'fas', 'fa-user')} />
              <span className="focus-border" />
            </div>
            {errors.username && <span className="form-error">{errors.username.message}</span>}
          </div>

          <div className={styles['form-group']} data-delay="200">
            <div className={styles['input-icon-wrapper']}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe"
                autoComplete="current-password"
                {...register('password')}
              />
              <i className={cx(styles, 'input-icon', 'fas', 'fa-lock')} />
              <button
                type="button"
                className={styles['password-toggle']}
                onClick={() => setShowPassword((v) => !v)}
              >
                <i className={showPassword ? 'far fa-eye-slash' : 'far fa-eye'} />
              </button>
              <span className="focus-border" />
            </div>
            {errors.password && <span className="form-error">{errors.password.message}</span>}
          </div>

          <div className={styles['form-options']} data-delay="300">
            <Link href="/forgot-password" className={styles['forgot-password']}>
              Mot de passe oublié?
            </Link>
          </div>

          <button
            type="submit"
            className={styles['btn-submit']}
            data-delay="400"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Connexion...' : 'Se connecter'} <i className="fas fa-arrow-right" />
          </button>
        </form>

        <div className={styles['auth-separator']} data-delay="500">
          <span>ou</span>
        </div>

        <div className={styles['social-login']} data-delay="600">
          <a href="/auth/google" className={cx(styles, 'social-btn', 'google-btn')}>
            <i className="fa-brands fa-google" /> Continuer avec Google
          </a>
        </div>

        <div className={styles['auth-footer']}>
          Pas encore de compte?{' '}
          <Link href="/register" className={styles['auth-link']}>
            S&apos;inscrire
          </Link>
        </div>
      </div>
    </div>
  );
}
