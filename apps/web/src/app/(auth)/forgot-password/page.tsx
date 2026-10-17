'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import toast from 'react-hot-toast';
import { useForgotPassword } from '@/hooks/use-auth';
import { getApiErrorMessage } from '@/lib/api-error';
import { cx } from '@/lib/css-module';
import styles from '@/styles/password-reset.module.css';

const schema = z.object({
  email: z.email('Adresse email invalide'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await forgotPassword.mutateAsync(data.email);
      toast.success(res.message);
      setSubmitted(true);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Une erreur est survenue'));
    }
  };

  return (
    <div className={styles['forgot-password-container']}>
      <h1 className={styles['forgot-password-title']}>Forgot Password</h1>

      {submitted ? (
        <div className={cx(styles, 'alert', 'alert-success')} style={{ display: 'block' }}>
          <p>Un email a été envoyé. Vérifiez votre boîte de réception.</p>
        </div>
      ) : (
        <form className={styles['forgot-password-form']} onSubmit={handleSubmit(onSubmit)}>
          <div className={styles['input-icon-wrapper']}>
            <input
              type="email"
              placeholder="Adresse email"
              {...register('email')}
            />
            <i className={cx(styles, 'input-icon', 'fas', 'fa-envelope')} />
            <span className={styles['focus-border']} />
          </div>
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
          )}

          <button type="submit" className="btn-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Envoi...' : 'Send Reset Link'}
          </button>
        </form>
      )}

      <Link href="/login" className={styles['back-link']}>
        Back to Login
      </Link>
    </div>
  );
}
