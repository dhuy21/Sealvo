'use client';

import { useEffect, useState } from 'react';
import type { Package } from '@/hooks/use-packages';

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const isEdit = !!editPkg;

  return (
    <div
      className="modal-overlay"
      style={{ display: 'flex' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h3>
            <i className={`fas fa-${isEdit ? 'edit' : 'plus-circle'}`}></i>{' '}
            {isEdit ? 'Modifier le package' : 'Créer un package'}
          </h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ package_name: name.trim(), package_description: description.trim(), mode });
          }}
        >
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="packageName">
                <i className="fas fa-tag"></i> Nom du package
              </label>
              <input
                type="text"
                id="packageName"
                className="form-input"
                placeholder="Ex: Vocabulaire Business"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="packageDescription">
                <i className="fas fa-align-left"></i> Description
              </label>
              <textarea
                id="packageDescription"
                className="form-textarea"
                placeholder="Décrivez brièvement le contenu de ce package..."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="packageMode">
                <i className="fas fa-cog"></i> Mode de visibilité
              </label>
              <select
                id="packageMode"
                className="form-select"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="private">Privé - Visible uniquement par vous</option>
                <option value="public">Public - Visible par tous</option>
                <option value="protected">Protégé - Visible mais non modifiable</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              <i className="fas fa-times"></i> Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
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
