'use client';

export function DeleteAllModal({
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
  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      style={{ display: 'flex' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-content modal-danger">
        <div className="modal-header">
          <h3>
            <i className="fas fa-exclamation-triangle"></i> Supprimer tous les mots
          </h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          <p>Êtes-vous sûr de vouloir supprimer <strong>tous les mots</strong> de ce package ?</p>
          <p className="warning-text">
            <i className="fas fa-warning"></i> Cette action est irréversible.
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={saving}>
            {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-trash"></i>}{' '}
            Supprimer tout
          </button>
        </div>
      </div>
    </div>
  );
}
