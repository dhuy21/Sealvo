'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import '@/styles/auth.css';

const AVATARS = Array.from({ length: 11 }, (_, i) => i + 1);

const registerSchema = z
  .object({
    username: z.string().min(3, 'Minimum 3 caractères'),
    email: z.email('Email invalide'),
    password: z.string().min(6, 'Minimum 6 caractères'),
    password2: z.string(),
    avatar: z.number().int().min(1).max(11),
    terms: z.literal(true, { message: 'Vous devez accepter les conditions' }),
  })
  .refine((data) => data.password === data.password2, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['password2'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { avatar: 1, terms: false as unknown as true },
  });

  const selectedAvatar = watch('avatar');

  const onSubmit = async (data: RegisterForm) => {
    try {
      await api.post('/auth/register', {
        username: data.username,
        email: data.email,
        password: data.password,
        avatar: data.avatar,
      });
      toast.success('Compte créé ! Vérifiez votre email.');
      router.push('/login');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Erreur lors de l\'inscription';
      toast.error(message);
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
          <h1>Inscription</h1>
          <p className="auth-subtitle">Créez votre compte pour commencer votre apprentissage</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
          <div className="form-group">
            <div className="input-icon-wrapper">
              <input type="text" placeholder="Nom d'utilisateur" autoComplete="username" {...register('username')} />
              <i className="input-icon fas fa-user" />
              <span className="focus-border" />
            </div>
            {errors.username && <span className="form-error">{errors.username.message}</span>}
          </div>

          <div className="form-group">
            <div className="input-icon-wrapper">
              <input type="email" placeholder="Adresse email" autoComplete="email" {...register('email')} />
              <i className="input-icon fas fa-envelope" />
              <span className="focus-border" />
            </div>
            {errors.email && <span className="form-error">{errors.email.message}</span>}
          </div>

          <div className="form-group">
            <div className="input-icon-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe"
                autoComplete="new-password"
                {...register('password')}
              />
              <i className="input-icon fas fa-lock" />
              <button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)}>
                <i className={showPassword ? 'far fa-eye-slash' : 'far fa-eye'} />
              </button>
              <span className="focus-border" />
            </div>
            {errors.password && <span className="form-error">{errors.password.message}</span>}
          </div>

          <div className="form-group">
            <div className="input-icon-wrapper">
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirmer le mot de passe"
                autoComplete="new-password"
                {...register('password2')}
              />
              <i className="input-icon fas fa-lock" />
              <button type="button" className="password-toggle" onClick={() => setShowConfirm((v) => !v)}>
                <i className={showConfirm ? 'far fa-eye-slash' : 'far fa-eye'} />
              </button>
              <span className="focus-border" />
            </div>
            {errors.password2 && <span className="form-error">{errors.password2.message}</span>}
          </div>

          <div className="form-options">
            <div className="terms-check">
              <input type="checkbox" id="terms" {...register('terms')} />
              <label htmlFor="terms">
                J&apos;accepte les <a href="/terms" className="terms-link">conditions d&apos;utilisation</a>
              </label>
            </div>
            {errors.terms && <span className="form-error">{errors.terms.message}</span>}
          </div>

          <div className="form-group avatar-selection">
            <label className="avatar-label">Choisissez votre avatar</label>
            <div className="avatars-container">
              {AVATARS.map((num) => (
                <div key={num} className={`avatar-option ${selectedAvatar === num ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    id={`avatar-${num}`}
                    checked={selectedAvatar === num}
                    onChange={() => setValue('avatar', num)}
                  />
                  <label htmlFor={`avatar-${num}`}>
                    <Image src={`/images/avatars/${num}.png`} alt={`Avatar ${num}`} width={50} height={50} />
                  </label>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Inscription...' : 'S\'inscrire'} <i className="fas fa-arrow-right" />
          </button>
        </form>

        <div className="auth-footer">
          Déjà un compte?{' '}
          <Link href="/login" className="auth-link">
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
