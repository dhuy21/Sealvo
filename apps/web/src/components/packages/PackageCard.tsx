'use client';

import type { Package } from '@/hooks/use-packages';

export function PackageCard({
  pkg,
  isPublicView,
  currentUserId,
  onEdit,
  onDelete,
  onToggle,
  onView,
  onLearn,
  onCopy,
}: {
  pkg: Package;
  isPublicView: boolean;
  currentUserId: string;
  onEdit: (pkg: Package) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number) => void;
  onView: (id: number) => void;
  onLearn: (id: number) => void;
  onCopy: (id: number) => void;
}) {
  const modeIcon =
    pkg.mode === 'private' ? 'fa-lock' : pkg.mode === 'public' ? 'fa-globe' : 'fa-shield-alt';
  const modeLabel =
    pkg.mode === 'private' ? 'Privé' : pkg.mode === 'public' ? 'Public' : 'Protégé';

  return (
    <div
      className={`package-card${!pkg.is_active ? ' inactive' : ''}${isPublicView ? ' public-package' : ''}`}
      data-package-id={pkg.package_id}
      data-mode={pkg.mode}
    >
      <div className="package-card-header">
        <div className="package-badges">
          <div className={`package-mode-badge mode-${pkg.mode}`}>
            <i className={`fas ${modeIcon}`}></i> {modeLabel}
          </div>
          {isPublicView && pkg.username ? (
            <div className="owner-badge">
              <i className="fas fa-user"></i> {pkg.username}
            </div>
          ) : (
            <div className={`status-badge ${pkg.is_active ? 'active' : 'inactive'}`}>
              {pkg.is_active ? 'Actif' : 'Inactif'}
            </div>
          )}
        </div>
        {!isPublicView && (
          <div className="package-actions">
            <button
              className="action-btn edit-btn"
              title="Modifier"
              onClick={() => onEdit(pkg)}
            >
              <i className="fas fa-edit"></i>
            </button>
            <button
              className="action-btn delete-btn"
              title="Supprimer"
              onClick={() => onDelete(pkg.package_id)}
            >
              <i className="fas fa-trash"></i>
            </button>
          </div>
        )}
      </div>

      <div className="package-card-body">
        <div className={isPublicView ? 'package-public-icon' : 'package-icon'}>
          {isPublicView ? (
            <div className="eye-lid">
              <div className="eye">
                <div className="cornea">
                  <div className="white-pupil"></div>
                </div>
              </div>
            </div>
          ) : (
            <i className="fas fa-box-open"></i>
          )}
        </div>
        <div className="package-name">{pkg.package_name}</div>
        <div className="package-description">{pkg.package_description}</div>
      </div>

      <div className="package-card-footer">
        <button className="pushable view-package-btn" onClick={() => onView(pkg.package_id)}>
          <span className="shadow"></span>
          <span className="edge"></span>
          <span className="front custom-front">
            <i className="fas fa-eye"></i> Voir
          </span>
        </button>

        {!isPublicView && (
          <>
            <button className="pushable learn-package-btn" onClick={() => onLearn(pkg.package_id)}>
              <span className="shadow"></span>
              <span className="edge"></span>
              <span className="front">
                <i className="fas fa-graduation-cap"></i> Apprendre
              </span>
            </button>
            <button
              className={`pushable toggle-activation-btn ${pkg.is_active ? 'pushable-warning' : 'pushable-success'}`}
              onClick={() => onToggle(pkg.package_id)}
            >
              <span
                className={`shadow ${pkg.is_active ? 'shadow-warning' : 'shadow-success'}`}
              ></span>
              <span
                className={`edge ${pkg.is_active ? 'edge-warning' : 'edge-success'}`}
              ></span>
              <span
                className={`front ${pkg.is_active ? 'front-warning' : 'front-success'}`}
              >
                {pkg.is_active ? (
                  <>
                    <i className="fas fa-pause"></i> Désactiver
                  </>
                ) : (
                  <>
                    <i className="fas fa-play"></i> Activer
                  </>
                )}
              </span>
            </button>
          </>
        )}

        {isPublicView && pkg.mode === 'public' && pkg.user_id !== currentUserId && (
          <button className="pushable copy-package-btn" onClick={() => onCopy(pkg.package_id)}>
            <span className="shadow-copy"></span>
            <span className="edge-copy"></span>
            <span className="front-copy">
              <i className="fas fa-download"></i> Copier
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
