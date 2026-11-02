'use client';

import { useId } from 'react';
import { createPortal } from 'react-dom';
import { useDialog } from '@/hooks/use-dialog';
import { useIsClient } from '@/hooks/use-is-client';
import { cx } from '@/lib/css-module';
import styles from '@/styles/learn.module.css';

export function ResetSessionModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const isClient = useIsClient();
  const titleId = useId();
  const dialogRef = useDialog<HTMLDivElement>(open, onClose);

  if (!isClient || !open) return null;

  return createPortal(
    <div
      className={cx(styles, 'reset-modal')}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={cx(styles, 'reset-dialog')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <h2 id={titleId}>Recommencer la session</h2>
        <p>
          Les marques « À revoir » et « Appris » de cette session seront effacées, et vous
          reviendrez à la première carte.
        </p>
        <p>Le niveau de vos mots et votre série ne changent pas.</p>
        <div className={cx(styles, 'reset-actions')}>
          <button type="button" className={cx(styles, 'reset-cancel')} onClick={onClose}>
            Annuler
          </button>
          <button type="button" className={cx(styles, 'reset-confirm')} onClick={onConfirm}>
            Recommencer
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
