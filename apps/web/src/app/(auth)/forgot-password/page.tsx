'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const schema = z.object({
  email: z.email('Adresse email invalide'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post('/auth/forgot-password', data);
      toast.success(res.data.message);
      setSubmitted(true);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Une erreur est survenue';
      toast.error(message);
    }
  };

  return (
    <div className="forgot-password-container">
      <h1 className="forgot-password-title">Forgot Password</h1>

      {submitted ? (
        <div className="alert alert-success" style={{ display: 'block' }}>
          <p>Un email a été envoyé. Vérifiez votre boîte de réception.</p>
        </div>
      ) : (
        <form className="forgot-password-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="input-icon-wrapper">
            <input
              type="email"
              placeholder="Adresse email"
              {...register('email')}
            />
            <i className="input-icon fas fa-envelope" />
            <span className="focus-border" />
          </div>
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
          )}

          <button type="submit" className="btn-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Envoi...' : 'Send Reset Link'}
          </button>
        </form>
      )}

      <Link href="/login" className="back-link">
        Back to Login
      </Link>
    </div>
  );
}
