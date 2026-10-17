'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { AUTH_LIMITS, AVATAR_COUNT } from '@sealvo/shared';
import { AuthDecor } from '@/components/auth/AuthDecor';
import { useRegister } from '@/hooks/use-auth';
import { getApiErrorMessage } from '@/lib/api-error';
import { cx } from '@/lib/css-module';
import styles from '@/styles/auth.module.css';

const AVATARS = Array.from({ length: AVATAR_COUNT }, (_, i) => i + 1);

const registerSchema = z
  .object({
    username: z
      .string()
      .min(AUTH_LIMITS.USERNAME_MIN, `Minimum ${AUTH_LIMITS.USERNAME_MIN} caractères`)
      .max(
        AUTH_LIMITS.USERNAME_MAX,
        `Le nom d'utilisateur doit contenir entre ${AUTH_LIMITS.USERNAME_MIN} et ${AUTH_LIMITS.USERNAME_MAX} caractères`,
      ),
    email: z.email('Email invalide'),
    password: z.string().min(AUTH_LIMITS.PASSWORD_MIN, `Minimum ${AUTH_LIMITS.PASSWORD_MIN} caractères`),
    password2: z.string(),
    avatar: z.number().int().min(1).max(AVATAR_COUNT),
    terms: z.literal(true, { message: 'Vous devez accepter les conditions' }),
  })
  .refine((data) => data.password === data.password2, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['password2'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

type Status = { type: 'success' | 'error'; message: string };

export default function RegisterPage() {
  const registerAccount = useRegister();
  const [status, setStatus] = useState<Status | null>(null);
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
      const res = await registerAccount.mutateAsync({
        username: data.username,
        email: data.email,
        password: data.password,
        avatar: data.avatar,
      });
      setStatus({ type: 'success', message: res.message });
    } catch (err: unknown) {
      setStatus({
        type: 'error',
        message: getApiErrorMessage(err, 'Une erreur est survenue. Veuillez réessayer plus tard.'),
      });
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
          <h1>Inscription</h1>
          <p className={styles['auth-subtitle']}>Créez votre compte pour commencer votre apprentissage</p>
        </div>

        {status && (
          <div className={cx(styles, 'alert', `alert-${status.type}`)}>
            <i className={`fas fa-${status.type === 'success' ? 'check-circle' : 'exclamation-circle'}`} />
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className={styles['auth-form']}>
          <div className={styles['form-group']} data-delay="100">
            <div className={styles['input-icon-wrapper']}>
              <input type="text" placeholder="Nom d'utilisateur" autoComplete="username" {...register('username')} />
              <i className={cx(styles, 'input-icon', 'fas', 'fa-user')} />
              <span className="focus-border" />
            </div>
            {errors.username && <span className="form-error">{errors.username.message}</span>}
          </div>

          <div className={styles['form-group']} data-delay="200">
            <div className={styles['input-icon-wrapper']}>
              <input type="email" placeholder="Adresse email" autoComplete="email" {...register('email')} />
              <i className={cx(styles, 'input-icon', 'fas', 'fa-envelope')} />
              <span className="focus-border" />
            </div>
            {errors.email && <span className="form-error">{errors.email.message}</span>}
          </div>

          <div className={styles['form-group']} data-delay="300">
            <div className={styles['input-icon-wrapper']}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe"
                autoComplete="new-password"
                {...register('password')}
              />
              <i className={cx(styles, 'input-icon', 'fas', 'fa-lock')} />
              <button type="button" className={styles['password-toggle']} onClick={() => setShowPassword((v) => !v)}>
                <i className={showPassword ? 'far fa-eye-slash' : 'far fa-eye'} />
              </button>
              <span className="focus-border" />
            </div>
            {errors.password && <span className="form-error">{errors.password.message}</span>}
          </div>

          <div className={styles['form-group']} data-delay="400">
            <div className={styles['input-icon-wrapper']}>
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirmer le mot de passe"
                autoComplete="new-password"
                {...register('password2')}
              />
              <i className={cx(styles, 'input-icon', 'fas', 'fa-lock')} />
              <button type="button" className={styles['password-toggle']} onClick={() => setShowConfirm((v) => !v)}>
                <i className={showConfirm ? 'far fa-eye-slash' : 'far fa-eye'} />
              </button>
              <span className="focus-border" />
            </div>
            {errors.password2 && <span className="form-error">{errors.password2.message}</span>}
          </div>

          <div className={styles['form-options']} data-delay="500">
            <div className={styles['terms-check']}>
              <input type="checkbox" id="terms" {...register('terms')} />
              <label htmlFor="terms">
                J&apos;accepte les <a href="/terms" className={styles['terms-link']}>conditions d&apos;utilisation</a>
              </label>
            </div>
            {errors.terms && <span className="form-error">{errors.terms.message}</span>}
          </div>

          <div className={cx(styles, 'form-group', 'avatar-selection')} data-delay="550">
            <label className={styles['avatar-label']}>Choisissez votre avatar</label>
            <div className={styles['avatars-container']}>
              {AVATARS.map((num) => (
                <div key={num} className={cx(styles, 'avatar-option', selectedAvatar === num && 'selected')}>
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

          <button type="submit" className={styles['btn-submit']} data-delay="600" disabled={isSubmitting}>
            {isSubmitting ? 'Inscription...' : 'S\'inscrire'} <i className="fas fa-arrow-right" />
          </button>
        </form>

        <div className={styles['auth-separator']} data-delay="700">
          <span>ou</span>
        </div>

        <div className={styles['social-login']} data-delay="800">
          <a href="/auth/google" className={cx(styles, 'social-btn', 'google-btn')}>
            <i className="fa-brands fa-google" /> Continuer avec Google
          </a>
        </div>

        <div className={styles['auth-footer']}>
          Déjà un compte?{' '}
          <Link href="/login" className={styles['auth-link']}>
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
