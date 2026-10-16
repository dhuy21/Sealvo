'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';

const schema = z
  .object({
    password: z.string().min(8, 'Minimum 8 caractères'),
    confirmPassword: z.string().min(8, 'Minimum 8 caractères'),
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
  const [success, setSuccess] = useState(false);

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
      const res = await api.post('/auth/reset-password', {
        token,
        password: data.password,
      });
      toast.success(res.data.message);
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Une erreur est survenue'));
    }
  };

  if (!token) {
    return (
      <div className="reset-password-container">
        <h1 className="reset-password-title">Reset Password</h1>
        <p className="text-red-500">Lien de réinitialisation invalide.</p>
        <Link href="/login" className="back-link">Back to Login</Link>
      </div>
    );
  }

  return (
    <div className="reset-password-container">
      <h1 className="reset-password-title">Reset Password</h1>

      {success ? (
        <div className="alert alert-success" style={{ display: 'block' }}>
          <p>Mot de passe réinitialisé ! Redirection vers la connexion...</p>
        </div>
      ) : (
        <form className="reset-password-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="input-icon-wrapper">
            <input
              type="password"
              placeholder="Nouveau mot de passe (min 8 caractères)"
              {...register('password')}
            />
            <i className="input-icon fas fa-lock" />
            <span className="focus-border" />
          </div>
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
          )}

          <div className="input-icon-wrapper">
            <input
              type="password"
              placeholder="Confirmer le mot de passe"
              {...register('confirmPassword')}
            />
            <i className="input-icon fas fa-lock" />
            <span className="focus-border" />
          </div>
          {errors.confirmPassword && (
            <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
          )}

          <button type="submit" className="btn-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Réinitialisation...' : 'Reset Password'}
          </button>
        </form>
      )}

      <Link href="/login" className="back-link">Back to Login</Link>
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
