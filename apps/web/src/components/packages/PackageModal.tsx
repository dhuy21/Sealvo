'use client';

import { useId, useState } from 'react';
import { PACKAGE_NAME_MAX } from '@sealvo/shared';
import { useDialog } from '@/hooks/use-dialog';
import type { Package } from '@/hooks/use-packages';
import styles from '@/styles/packages.module.css';
import { cx } from '@/lib/css-module';

interface PackageModalProps {
  editPkg: Package | null;
  onClose: () => void;
  onSubmit: (data: { package_name: string; package_description: string; mode: string }) => void;
  saving: boolean;
}

/** Content is unmounted while closed, so the form restarts from `editPkg` on every open. */
export function PackageModal({ open, ...props }: PackageModalProps & { open: boolean }) {
  return open ? <PackageModalContent {...props} /> : null;
}

function PackageModalContent({ editPkg, onClose, onSubmit, saving }: PackageModalProps) {
  const [name, setName] = useState(editPkg?.package_name ?? '');
  const [description, setDescription] = useState(editPkg?.package_description ?? '');
  const [mode, setMode] = useState<string>(editPkg?.mode ?? 'private');

  const dialogRef = useDialog<HTMLDivElement>(true, onClose);
  const titleId = useId();

  const isEdit = !!editPkg;

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
        className={cx(styles, 'modal-content')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className={cx(styles, 'modal-header')}>
          <h3 id={titleId}>
            <i className={`fas fa-${isEdit ? 'edit' : 'plus-circle'}`}></i>{' '}
            {isEdit ? 'Modifier le package' : 'Créer un package'}
          </h3>
          <button className={cx(styles, 'modal-close')} aria-label="Fermer" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ package_name: name.trim(), package_description: description.trim(), mode });
          }}
        >
          <div className={cx(styles, 'modal-body')}>
            <div className={cx(styles, 'form-group')}>
              <label htmlFor="packageName">
                <i className="fas fa-tag"></i> Nom du package
              </label>
              <input
                type="text"
                id="packageName"
                className={cx(styles, 'form-input')}
                placeholder="Ex: Vocabulaire Business"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={PACKAGE_NAME_MAX}
                required
              />
            </div>

            <div className={cx(styles, 'form-group')}>
              <label htmlFor="packageDescription">
                <i className="fas fa-align-left"></i> Description
              </label>
              <textarea
                id="packageDescription"
                className={cx(styles, 'form-textarea')}
                placeholder="Décrivez brièvement le contenu de ce package..."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className={cx(styles, 'form-group')}>
              <label htmlFor="packageMode">
                <i className="fas fa-cog"></i> Mode de visibilité
              </label>
              <select
                id="packageMode"
                className={cx(styles, 'form-select')}
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="private">Privé - Visible uniquement par vous</option>
                <option value="public">Public - Visible par tous</option>
                <option value="protected">Protégé - Visible mais non modifiable</option>
              </select>
            </div>
          </div>

          <div className={cx(styles, 'modal-footer')}>
            <button type="button" className={cx(styles, 'btn', 'btn-secondary')} onClick={onClose}>
              <i className="fas fa-times"></i> Annuler
            </button>
            <button type="submit" className={cx(styles, 'btn', 'btn-primary')} disabled={saving}>
              {saving ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-save"></i>
              )}{' '}
              {isEdit ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
