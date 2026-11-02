'use client';

import { useId } from 'react';
import { useDialog } from '@/hooks/use-dialog';
import styles from '@/styles/packages.module.css';
import { cx } from '@/lib/css-module';

export function DeleteModal({
  open,
  onClose,
  onConfirm,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  saving: boolean;
}) {
  const dialogRef = useDialog<HTMLDivElement>(open, onClose);
  const titleId = useId();
  if (!open) return null;

  return (
    <div
      className={cx(styles, 'modal-overlay', 'active')}
      style={{ display: 'flex' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={cx(styles, 'modal-content', 'modal-danger')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className={cx(styles, 'modal-header')}>
          <h3 id={titleId}>
            <i className="fas fa-exclamation-triangle"></i> Confirmer la suppression
          </h3>
          <button className={cx(styles, 'modal-close')} aria-label="Fermer" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className={cx(styles, 'modal-body')}>
          <p>Êtes-vous sûr de vouloir supprimer ce package ?</p>
          <p className={cx(styles, 'warning-text')}>
            <i className="fas fa-warning"></i> Cette action est irréversible et supprimera tous les
            mots associés à ce package.
          </p>
        </div>
        <div className={cx(styles, 'modal-footer')}>
          <button type="button" className={cx(styles, 'btn', 'btn-secondary')} onClick={onClose}>
            <i className="fas fa-times"></i> Annuler
          </button>
          <button
            type="button"
            className={cx(styles, 'btn', 'btn-danger')}
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-trash"></i>}{' '}
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}
