'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import toast from 'react-hot-toast';
import { AUTH_LIMITS } from '@sealvo/shared';
import { useResetPassword } from '@/hooks/use-auth';
import { getApiErrorMessage } from '@/lib/api-error';
import { cx } from '@/lib/css-module';
import styles from '@/styles/password-reset.module.css';

const PASSWORD_MIN_MESSAGE = `Minimum ${AUTH_LIMITS.RESET_PASSWORD_MIN} caractères`;

const schema = z
  .object({
    password: z.string().min(AUTH_LIMITS.RESET_PASSWORD_MIN, PASSWORD_MIN_MESSAGE),
    confirmPassword: z.string().min(AUTH_LIMITS.RESET_PASSWORD_MIN, PASSWORD_MIN_MESSAGE),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const resetPassword = useResetPassword();
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => router.push('/login'), 3000);
    return () => clearTimeout(timer);
  }, [success, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    if (!token) {
      toast.error('Token manquant');
      return;
    }
    try {
      const res = await resetPassword.mutateAsync({ token, password: data.password });
      toast.success(res.message);
      setSuccess(true);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Une erreur est survenue'));
    }
  };

  if (!token) {
    return (
      <div className={styles['reset-password-container']}>
        <h1 className={styles['reset-password-title']}>Reset Password</h1>
        <p className="text-red-500">Lien de réinitialisation invalide.</p>
        <Link href="/login" className={styles['back-link']}>Back to Login</Link>
      </div>
    );
  }

  return (
    <div className={styles['reset-password-container']}>
      <h1 className={styles['reset-password-title']}>Reset Password</h1>

      {success ? (
        <div className={cx(styles, 'alert', 'alert-success')} style={{ display: 'block' }}>
          <p>Mot de passe réinitialisé ! Redirection vers la connexion...</p>
        </div>
      ) : (
        <form className={styles['reset-password-form']} onSubmit={handleSubmit(onSubmit)}>
          <div className={styles['input-icon-wrapper']}>
            <input
              type="password"
              placeholder={`Nouveau mot de passe (min ${AUTH_LIMITS.RESET_PASSWORD_MIN} caractères)`}
              {...register('password')}
            />
            <i className={cx(styles, 'input-icon', 'fas', 'fa-lock')} />
            <span className={styles['focus-border']} />
          </div>
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
          )}

          <div className={styles['input-icon-wrapper']}>
            <input
              type="password"
              placeholder="Confirmer le mot de passe"
              {...register('confirmPassword')}
            />
            <i className={cx(styles, 'input-icon', 'fas', 'fa-lock')} />
            <span className={styles['focus-border']} />
          </div>
          {errors.confirmPassword && (
            <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
          )}

          <button type="submit" className="btn-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Réinitialisation...' : 'Reset Password'}
          </button>
        </form>
      )}

      <Link href="/login" className={styles['back-link']}>Back to Login</Link>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
