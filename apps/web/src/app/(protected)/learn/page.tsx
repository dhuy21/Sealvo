'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useReviewWords } from '@/hooks/use-words';
import { usePackageIdParam } from '@/hooks/use-package-id-param';
import { LearnSession } from '@/components/learn/LearnSession';
import { BrowserWarningModal } from '@/components/learn/BrowserWarningModal';
import { getApiErrorMessage } from '@/lib/api-error';
import { cx } from '@/lib/css-module';
import styles from '@/styles/learn.module.css';

/* ═══════════════════════════ */
/* LEARN PAGE CONTENT          */
/* ═══════════════════════════ */
function LearnContent() {
  const router = useRouter();
  const packageId = usePackageIdParam();
  const { data: words, isPending, error } = useReviewWords(packageId);

  if (!packageId) {
    return (
      <div
        className={cx(styles, 'learn-container')}
        style={{ textAlign: 'center', padding: '4rem' }}
      >
        <p>Aucun package sélectionné.</p>
        <button className={cx(styles, 'btn')} onClick={() => router.push('/packages')}>
          Retour aux packages
        </button>
      </div>
    );
  }

  if (isPending) {
    return (
      <div
        className={cx(styles, 'learn-container')}
        style={{ textAlign: 'center', padding: '4rem' }}
      >
        <i className="fas fa-spinner fa-spin fa-2x"></i>
      </div>
    );
  }

  if (!words && error) {
    return (
      <div
        className={cx(styles, 'learn-container')}
        style={{ textAlign: 'center', padding: '4rem' }}
      >
        <div className={cx(styles, 'no-words')}>
          <i className="fas fa-exclamation-circle"></i>
          <p>
            {getApiErrorMessage(
              error,
              'Une erreur est survenue lors de la récupération des mots à apprendre',
            )}
          </p>
          <button
            className={cx(styles, 'btn')}
            onClick={() => router.push(`/words?package=${packageId}`)}
          >
            Retour à mon vocabulaire
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cx(styles, 'learn-container')}>
      <h1 className={cx(styles, 'learn-title')}>Apprendre mon vocabulaire</h1>

      {words && words.length > 0 ? (
        <LearnSession words={words} packageId={packageId} />
      ) : (
        <div className={cx(styles, 'no-words')}>
          <i className="fas fa-book"></i>
          <h3>Aucun mot dans votre vocabulaire</h3>
          <p>Commencez à ajouter des mots pour pouvoir les apprendre.</p>
          <button
            className={cx(styles, 'btn')}
            onClick={() => router.push(`/words?package=${packageId}`)}
          >
            Ajouter votre premier mot
          </button>
        </div>
      )}

      <div className={cx(styles, 'home-cta')}>
        <button
          className={cx(styles, 'btn', 'back-btn')}
          onClick={() => router.push(`/words?package=${packageId}`)}
        >
          <i className="fas fa-arrow-left"></i> Retour à mon vocabulaire
        </button>
      </div>
    </div>
  );
}

export default function LearnPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <i className="fas fa-spinner fa-spin fa-2x"></i>
        </div>
      }
    >
      <BrowserWarningModal />
      <LearnContent />
    </Suspense>
  );
}
