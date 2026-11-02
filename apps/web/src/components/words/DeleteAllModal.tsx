'use client';

import { useEffect, useId, useState } from 'react';
import { useDialog } from '@/hooks/use-dialog';
import styles from '@/styles/vocabs.module.css';
import { cx } from '@/lib/css-module';

export type DeleteAllStatus = 'idle' | 'loading' | 'success';

/** Port of the old createConfirmationModal(): fades in after mount, fades out before unmount. */
export function DeleteAllModal({
  open,
  status,
  onClose,
  onConfirm,
}: {
  open: boolean;
  status: DeleteAllStatus;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    const timer = open
      ? setTimeout(() => setEntered(true), 100)
      : setTimeout(() => {
          setEntered(false);
          setMounted(false);
        }, 300);
    return () => clearTimeout(timer);
  }, [open]);

  const shown = open && entered;

  const dialogRef = useDialog<HTMLDivElement>(open, onClose);
  const titleId = useId();

  if (!mounted) return null;

  const busy = status !== 'idle';

  return (
    <div
      className={cx(styles, 'delete-confirmation-modal', shown && 'show')}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={cx(styles, 'modal-content')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <button className={cx(styles, 'close-modal-btn')} aria-label="Fermer" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>

        <div className={cx(styles, 'modal-header')}>
          <div className={cx(styles, 'warning-icon')}>
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <h2 id={titleId}>Supprimer tous les mots</h2>
        </div>

        <div className={cx(styles, 'modal-body')}>
          <p>
            Êtes-vous absolument sûr de vouloir supprimer <strong>tous les mots</strong> de votre
            vocabulaire ?
          </p>
          <div className={cx(styles, 'warning-message')}>
            <i className="fas fa-info-circle"></i>
            <span>
              Cette action est <strong>irréversible</strong> et supprimera définitivement tous vos
              mots.
            </span>
          </div>
        </div>

        <div className={cx(styles, 'modal-footer')}>
          <button className={cx(styles, 'cancel-delete-btn')} onClick={onClose} disabled={busy}>
            <i className="fas fa-times"></i>
            Annuler
          </button>
          <button
            className={cx(
              styles,
              'confirm-delete-btn',
              status === 'loading' && 'loading',
              status === 'success' && 'success',
            )}
            onClick={onConfirm}
            disabled={busy}
          >
            {status === 'loading' ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Suppression...
              </>
            ) : status === 'success' ? (
              <>
                <i className="fas fa-check"></i> Supprimé !
              </>
            ) : (
              <>
                <i className="fas fa-trash"></i>
                Oui
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
