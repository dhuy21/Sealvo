'use client';

import type { Package } from '@/hooks/use-packages';
import styles from '@/styles/packages.module.css';
import { cx } from '@/lib/css-module';

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
  const modeLabel = pkg.mode === 'private' ? 'Privé' : pkg.mode === 'public' ? 'Public' : 'Protégé';

  return (
    <div
      className={cx(
        styles,
        'package-card',
        !pkg.is_active && 'inactive',
        isPublicView && 'public-package',
      )}
      data-package-id={pkg.package_id}
      data-mode={pkg.mode}
    >
      <div className={cx(styles, 'package-card-header')}>
        <div className={cx(styles, 'package-badges')}>
          <div className={cx(styles, 'package-mode-badge', `mode-${pkg.mode}`)}>
            <i className={`fas ${modeIcon}`}></i> {modeLabel}
          </div>
          {isPublicView && pkg.username ? (
            <div className={cx(styles, 'owner-badge')}>
              <i className="fas fa-user"></i> {pkg.username}
            </div>
          ) : (
            <div className={cx(styles, 'status-badge', pkg.is_active ? 'active' : 'inactive')}>
              {pkg.is_active ? 'Actif' : 'Inactif'}
            </div>
          )}
        </div>
        {!isPublicView && (
          <div className={cx(styles, 'package-actions')}>
            <button
              className={cx(styles, 'action-btn', 'edit-btn')}
              title="Modifier"
              onClick={() => onEdit(pkg)}
            >
              <i className="fas fa-edit"></i>
            </button>
            <button
              className={cx(styles, 'action-btn', 'delete-btn')}
              title="Supprimer"
              onClick={() => onDelete(pkg.package_id)}
            >
              <i className="fas fa-trash"></i>
            </button>
          </div>
        )}
      </div>

      <div className={cx(styles, 'package-card-body')}>
        <div className={cx(styles, isPublicView ? 'package-public-icon' : 'package-icon')}>
          {isPublicView ? (
            <div className={cx(styles, 'eye-lid')}>
              <div className={cx(styles, 'eye')}>
                <div className={cx(styles, 'cornea')}>
                  <div className={cx(styles, 'white-pupil')}></div>
                </div>
              </div>
            </div>
          ) : (
            <i className="fas fa-box-open"></i>
          )}
        </div>
        <div className={cx(styles, 'package-name')}>{pkg.package_name}</div>
        <div className={cx(styles, 'package-description')}>{pkg.package_description}</div>
      </div>

      <div className={cx(styles, 'package-card-footer')}>
        <button
          className={cx(styles, 'pushable', 'view-package-btn')}
          onClick={() => onView(pkg.package_id)}
        >
          <span className={cx(styles, 'shadow')}></span>
          <span className={cx(styles, 'edge')}></span>
          <span className={cx(styles, 'front', 'custom-front')}>
            <i className="fas fa-eye"></i> Voir
          </span>
        </button>

        {!isPublicView && (
          <>
            <button
              className={cx(styles, 'pushable', 'learn-package-btn')}
              onClick={() => onLearn(pkg.package_id)}
            >
              <span className={cx(styles, 'shadow')}></span>
              <span className={cx(styles, 'edge')}></span>
              <span className={cx(styles, 'front')}>
                <i className="fas fa-graduation-cap"></i> Apprendre
              </span>
            </button>
            <button
              className={cx(
                styles,
                'pushable',
                'toggle-activation-btn',
                pkg.is_active ? 'pushable-warning' : 'pushable-success',
              )}
              onClick={() => onToggle(pkg.package_id)}
            >
              <span
                className={cx(
                  styles,
                  'shadow',
                  pkg.is_active ? 'shadow-warning' : 'shadow-success',
                )}
              ></span>
              <span
                className={cx(styles, 'edge', pkg.is_active ? 'edge-warning' : 'edge-success')}
              ></span>
              <span
                className={cx(styles, 'front', pkg.is_active ? 'front-warning' : 'front-success')}
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
          <button
            className={cx(styles, 'pushable', 'copy-package-btn')}
            onClick={() => onCopy(pkg.package_id)}
          >
            <span className={cx(styles, 'shadow-copy')}></span>
            <span className={cx(styles, 'edge-copy')}></span>
            <span className={cx(styles, 'front-copy')}>
              <i className="fas fa-download"></i> Copier
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
