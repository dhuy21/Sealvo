'use client';

import { useId, useState } from 'react';
import { useDialog } from '@/hooks/use-dialog';
import { AVATAR_COUNT } from '@sealvo/shared';
import styles from '@/styles/dashboard.module.css';
import { cx } from '@/lib/css-module';

interface AvatarModalProps {
  currentAva: number;
  onClose: () => void;
  onSave: (ava: number) => void;
  saving: boolean;
}

/** Content is unmounted while closed, so the selection restarts from `currentAva` on every open. */
export function AvatarModal({ open, ...props }: AvatarModalProps & { open: boolean }) {
  return open ? <AvatarModalContent {...props} /> : null;
}

function AvatarModalContent({ currentAva, onClose, onSave, saving }: AvatarModalProps) {
  const [selected, setSelected] = useState(currentAva);

  const dialogRef = useDialog<HTMLDivElement>(true, onClose);
  const titleId = useId();

  return (
    <div
      className={cx(styles, 'avatar-modal')}
      style={{ display: 'block', opacity: 1 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={cx(styles, 'avatar-modal-content')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className={cx(styles, 'avatar-modal-header')}>
          <h3 id={titleId}>
            <i className="fas fa-user-circle"></i> Choisir un nouvel avatar
          </h3>
          <span className={cx(styles, 'avatar-modal-close')} onClick={onClose}>
            &times;
          </span>
        </div>
        <div className={cx(styles, 'avatar-modal-body')}>
          <div className={cx(styles, 'avatar-grid')}>
            {Array.from({ length: AVATAR_COUNT }, (_, i) => i + 1).map((n) => (
              <div
                key={n}
                className={cx(styles, 'avatar-option', selected === n && 'selected')}
                data-avatar={n}
                onClick={() => setSelected(n)}
              >
                <img
                  src={`/images/avatars/${n}.png`}
                  alt={`Avatar ${n}`}
                  className={cx(styles, 'avatar-selection')}
                  loading="lazy"
                />
                {selected === n && (
                  <div className={cx(styles, 'avatar-selected')}>
                    <i className="fas fa-check"></i>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className={cx(styles, 'avatar-modal-footer')}>
          <button id="cancelAvatarBtn" onClick={onClose}>
            Annuler
          </button>
          <button id="saveAvatarBtn" onClick={() => onSave(selected)} disabled={saving}>
            {saving ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Enregistrement...
              </>
            ) : (
              'Enregistrer'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
