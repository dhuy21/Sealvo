'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import toast from 'react-hot-toast';
import { useSendFeedback } from '@/hooks/use-feedback';
import { getApiErrorMessage } from '@/lib/api-error';
import { useAuthStore } from '@/stores/auth.store';
import { cx } from '@/lib/css-module';
import authStyles from '@/styles/auth.module.css';
import feedbackStyles from '@/styles/feedback.module.css';

const schema = z.object({
  type: z.enum(['suggestion', 'bug', 'question', 'appreciation', 'other'], {
    message: 'Veuillez sélectionner un type',
  }),
  subject: z.string().min(1, 'Sujet requis'),
  content: z.string().min(1, 'Détails requis'),
  email: z.union([z.email('Email invalide'), z.literal('')]).optional(),
});

type FormData = z.infer<typeof schema>;

export default function FeedbackPage() {
  const user = useAuthStore((s) => s.user);
  const sendFeedback = useSendFeedback();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await sendFeedback.mutateAsync({ ...data, email: data.email || undefined });
      toast.success(res.message);
      reset();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Une erreur est survenue'));
    }
  };

  return (
    <div className={`${authStyles['page']} ${feedbackStyles['feedback-container']}`}>
      <i className={cx(feedbackStyles, 'fas', 'fa-comment', 'floating-icons', 'float-icon-1')} />
      <i className={cx(feedbackStyles, 'fas', 'fa-lightbulb', 'floating-icons', 'float-icon-2')} />
      <i className={cx(feedbackStyles, 'fas', 'fa-star', 'floating-icons', 'float-icon-3')} />

      <div className="feedback-content">
        <div className={cx(feedbackStyles, 'feedback-header', 'fade-in')}>
          <h1>Donnez votre avis</h1>
          <p className={feedbackStyles['feedback-description']}>
            Votre opinion est importante pour nous améliorer. Partagez vos suggestions, signaler des
            problèmes ou dites-nous ce que vous aimez.
          </p>
        </div>

        <div className={cx(feedbackStyles, 'feedback-form-container', 'fade-in')}>
          <form className="feedback-form" onSubmit={handleSubmit(onSubmit)}>
            <div className={`${authStyles['form-group']} ${feedbackStyles['form-group']}`}>
              <label htmlFor="feedback-type">Type de feedback</label>
              <select
                id="feedback-type"
                className={feedbackStyles['form-control']}
                defaultValue=""
                {...register('type')}
              >
                <option value="" disabled>
                  Sélectionnez un type
                </option>
                <option value="suggestion">Suggestion</option>
                <option value="bug">Problème technique</option>
                <option value="question">Question</option>
                <option value="appreciation">Appréciation</option>
                <option value="other">Autre</option>
              </select>
              {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>}
            </div>

            <div className={`${authStyles['form-group']} ${feedbackStyles['form-group']}`}>
              <label htmlFor="feedback-subject">Sujet</label>
              <input
                type="text"
                id="feedback-subject"
                placeholder="Résumez votre feedback en quelques mots"
                className={feedbackStyles['form-control']}
                {...register('subject')}
              />
              {errors.subject && (
                <p className="text-red-500 text-sm mt-1">{errors.subject.message}</p>
              )}
            </div>

            <div className={`${authStyles['form-group']} ${feedbackStyles['form-group']}`}>
              <label htmlFor="feedback-content">Détails</label>
              <textarea
                id="feedback-content"
                rows={5}
                placeholder="Partagez les détails de votre feedback..."
                className={feedbackStyles['form-control']}
                {...register('content')}
              />
              {errors.content && (
                <p className="text-red-500 text-sm mt-1">{errors.content.message}</p>
              )}
            </div>

            <div className={`${authStyles['form-group']} ${feedbackStyles['form-group']}`}>
              <label htmlFor="feedback-email">Email (optionnel)</label>
              <input
                type="email"
                id="feedback-email"
                placeholder="Votre email (optionnel) pour recevoir une réponse"
                className={feedbackStyles['form-control']}
                {...register('email')}
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
            </div>

            <div className={feedbackStyles['feedback-actions']}>
              <button
                type="submit"
                className={`${cx(authStyles, 'btn', 'btn-primary')} ${cx(feedbackStyles, 'btn', 'btn-primary')}`}
                disabled={isSubmitting}
              >
                <i className="fas fa-paper-plane" /> {isSubmitting ? 'Envoi...' : 'Envoyer'}
              </button>
              <Link
                href={user ? '/dashboard' : '/'}
                className={`${cx(authStyles, 'btn', 'btn-secondary', 'btn-info')} ${feedbackStyles['btn']} ${feedbackStyles['btn-secondary']}`}
              >
                <i className="fas fa-arrow-left" /> Sortie
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
