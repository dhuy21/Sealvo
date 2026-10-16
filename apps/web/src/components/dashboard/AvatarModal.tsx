'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className={cx(styles, 'avatar-modal')}
      style={{ display: 'block', opacity: 1 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={cx(styles, 'avatar-modal-content')}>
        <div className={cx(styles, 'avatar-modal-header')}>
          <h3>
            <i className="fas fa-user-circle"></i> Choisir un nouvel avatar
          </h3>
          <span className={cx(styles, 'avatar-modal-close')} onClick={onClose}>
            &times;
          </span>
        </div>
        <div className={cx(styles, 'avatar-modal-body')}>
          <div className={cx(styles, 'avatar-grid')}>
            {Array.from({ length: 11 }, (_, i) => i + 1).map((n) => (
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
