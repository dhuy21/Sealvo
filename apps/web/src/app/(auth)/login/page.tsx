'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';
import { useAuthStore } from '@/stores/auth.store';
import type { User } from '@/stores/auth.store';
import { safeRedirect } from '@/lib/safe-redirect';
import '@/styles/auth.css';

const loginSchema = z.object({
  username: z.string().min(1, 'Nom d\'utilisateur requis'),
  password: z.string().min(1, 'Mot de passe requis'),
});

type LoginForm = z.infer<typeof loginSchema>;

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
  const login = useAuthStore((s) => s.login);
  const isReady = useAuthStore((s) => s.isReady);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isReady && isAuthenticated) {
      router.replace(safeRedirect(searchParams.get('redirect')));
    }
  }, [isReady, isAuthenticated, router, searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await api.post<{ accessToken: string }>('/auth/login', data);
      const meRes = await api.get<User>('/auth/me', {
        headers: { Authorization: `Bearer ${res.data.accessToken}` },
      });
      login(meRes.data, res.data.accessToken);
      toast.success('Connexion réussie !');
      router.push(safeRedirect(searchParams.get('redirect')));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Identifiants invalides'));
    }
  };

  return (
    <div className="auth-page">
      <div className="floating-card card-1">
        <i className="fas fa-quote-left" />
        <span> 🌱 It always seems impossible until it&apos;s done.</span>
        <i className="fas fa-quote-right" />
      </div>
      <div className="floating-card card-2">
        <i className="fas fa-quote-left" />
        <span> 🚀 Well done is better than well said.</span>
        <i className="fas fa-quote-right" />
      </div>
      <div className="floating-card card-3">
        <i className="fas fa-quote-left" />
        <span> 🌍 Rejoignez la communauté</span>
        <i className="fas fa-quote-right" />
      </div>
      <div className="floating-card card-4">
        <i className="fas fa-quote-left" />
        <span> 🌟 Act as if what you do makes a difference. It does.</span>
        <i className="fas fa-quote-right" />
      </div>
      <div className="floating-card card-5">
        <i className="fas fa-quote-left" />
        <span> 💡 N&apos;oubliez pas de prendre des pauses!</span>
        <i className="fas fa-quote-right" />
      </div>

      <div className="auth-container">
        <div className="auth-header">
          <div className="logo-icon">
            <i className="fas fa-graduation-cap" />
          </div>
          <h1>Connexion</h1>
          <p className="auth-subtitle">Connectez-vous pour continuer votre apprentissage</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
          <div className="form-group">
            <div className="input-icon-wrapper">
              <input
                type="text"
                placeholder="Nom d'utilisateur"
                autoComplete="username"
                {...register('username')}
              />
              <i className="input-icon fas fa-user" />
              <span className="focus-border" />
            </div>
            {errors.username && <span className="form-error">{errors.username.message}</span>}
          </div>

          <div className="form-group">
            <div className="input-icon-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe"
                autoComplete="current-password"
                {...register('password')}
              />
              <i className="input-icon fas fa-lock" />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
              >
                <i className={showPassword ? 'far fa-eye-slash' : 'far fa-eye'} />
              </button>
              <span className="focus-border" />
            </div>
            {errors.password && <span className="form-error">{errors.password.message}</span>}
          </div>

          <div className="form-options">
            <Link href="/forgot-password" className="forgot-password">
              Mot de passe oublié?
            </Link>
          </div>

          <button type="submit" className="btn-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Connexion...' : 'Se connecter'} <i className="fas fa-arrow-right" />
          </button>
        </form>

        <div className="auth-footer">
          Pas encore de compte?{' '}
          <Link href="/register" className="auth-link">
            S&apos;inscrire
          </Link>
        </div>
      </div>
    </div>
  );
}
