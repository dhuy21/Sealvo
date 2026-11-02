'use client';

import Link from 'next/link';
import styles from '@/styles/error.module.css';
import { cx } from '@/lib/css-module';

export const INTERNAL_ERROR_MESSAGE =
  'Une erreur interne est survenue. Veuillez réessayer plus tard.';

/** Port of the old error.hbs page. */
export function ErrorPanel({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className={cx(styles, 'error-container')}>
      <div className={cx(styles, 'error-box')}>
        <h1>Erreur</h1>
        <div className={cx(styles, 'error-message')}>
          <i className="fas fa-exclamation-triangle"></i>
          <p>{message}</p>
        </div>

        <div className={cx(styles, 'error-actions')}>
          <button
            type="button"
            className={cx(styles, 'btn', 'back-btn')}
            onClick={() => history.back()}
          >
            <i className="fas fa-arrow-left"></i>
            Retour
          </button>
          {onRetry && (
            <button type="button" className={cx(styles, 'btn', 'back-btn')} onClick={onRetry}>
              <i className="fas fa-redo"></i>
              Réessayer
            </button>
          )}
          <Link href="/" className={cx(styles, 'btn', 'home-btn')}>
            <i className="fas fa-home"></i>
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
