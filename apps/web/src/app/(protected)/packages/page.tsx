'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import {
  useMyPackages,
  usePublicPackages,
  useCreatePackage,
  useUpdatePackage,
  useDeletePackage,
  useTogglePackage,
  useCopyPackage,
} from '@/hooks/use-packages';
import type { Package } from '@/hooks/use-packages';
import toast from 'react-hot-toast';

type FilterType = 'my-packages' | 'all-public' | 'private' | 'public' | 'protected';

/* ─── Package Modal ─── */
function PackageModal({
  open,
  editPkg,
  onClose,
  onSubmit,
  saving,
}: {
  open: boolean;
  editPkg: Package | null;
  onClose: () => void;
  onSubmit: (data: { package_name: string; package_description: string; mode: string }) => void;
  saving: boolean;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState('private');

  useEffect(() => {
    if (open) {
      setName(editPkg?.package_name ?? '');
      setDescription(editPkg?.package_description ?? '');
      setMode(editPkg?.mode ?? 'private');
    }
  }, [open, editPkg]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

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

/* ─── Delete Confirm Modal ─── */
function DeleteModal({
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
            <i className="fas fa-exclamation-triangle"></i> Confirmer la suppression
          </h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          <p>Êtes-vous sûr de vouloir supprimer ce package ?</p>
          <p className="warning-text">
            <i className="fas fa-warning"></i> Cette action est irréversible et supprimera tous les
            mots associés à ce package.
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            <i className="fas fa-times"></i> Annuler
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={saving}>
            {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-trash"></i>}{' '}
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Package Card ─── */
function PackageCard({
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

        {isPublicView && pkg.user_id !== currentUserId && (
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

/* ═══════════════════════════ */
/* MAIN PACKAGES PAGE         */
/* ═══════════════════════════ */
export default function PackagesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: myPackages, isLoading: loadingMine } = useMyPackages();
  const { data: publicPackages, isLoading: loadingPublic } = usePublicPackages();

  const [filter, setFilter] = useState<FilterType>('my-packages');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editPkg, setEditPkg] = useState<Package | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const createPkg = useCreatePackage();
  const updatePkg = useUpdatePackage();
  const deletePkg = useDeletePackage();
  const togglePkg = useTogglePackage();
  const copyPkg = useCopyPackage();

  // Stats
  const stats = useMemo(() => {
    const pkgs = myPackages ?? [];
    return {
      total: pkgs.length,
      public: pkgs.filter((p) => p.mode === 'public').length,
      private: pkgs.filter((p) => p.mode === 'private').length,
    };
  }, [myPackages]);

  // Filtered packages
  const filteredPackages = useMemo(() => {
    const term = search.toLowerCase();
    let list: Package[] = [];

    if (filter === 'all-public') {
      list = publicPackages ?? [];
    } else {
      list = myPackages ?? [];
      if (filter === 'private' || filter === 'public' || filter === 'protected') {
        list = list.filter((p) => p.mode === filter);
      }
    }

    if (term) {
      list = list.filter(
        (p) =>
          p.package_name.toLowerCase().includes(term) ||
          (p.package_description ?? '').toLowerCase().includes(term) ||
          (p.username ?? '').toLowerCase().includes(term),
      );
    }

    return list;
  }, [myPackages, publicPackages, filter, search]);

  const isPublicView = filter === 'all-public';

  // Handlers
  const handleCreateOrEdit = useCallback(
    (data: { package_name: string; package_description: string; mode: string }) => {
      if (editPkg) {
        updatePkg.mutate(
          {
            id: editPkg.package_id,
            dto: {
              package_name: data.package_name,
              package_description: data.package_description,
              mode: data.mode as Package['mode'],
            },
          },
          {
            onSuccess: () => {
              toast.success('Package modifié avec succès');
              setModalOpen(false);
              setEditPkg(null);
            },
            onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
          },
        );
      } else {
        createPkg.mutate(
          {
            package_name: data.package_name,
            package_description: data.package_description,
            mode: data.mode as Package['mode'],
          },
          {
            onSuccess: () => {
              toast.success('Package créé avec succès');
              setModalOpen(false);
            },
            onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
          },
        );
      }
    },
    [editPkg, createPkg, updatePkg],
  );

  const handleDelete = useCallback(() => {
    if (deleteId === null) return;
    deletePkg.mutate(deleteId, {
      onSuccess: () => {
        toast.success('Package supprimé avec succès');
        setDeleteId(null);
      },
      onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
    });
  }, [deleteId, deletePkg]);

  const handleToggle = useCallback(
    (id: number) => {
      togglePkg.mutate(id, {
        onSuccess: (data: any) => {
          toast.success(data.is_active ? 'Package activé' : 'Package désactivé');
        },
        onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
      });
    },
    [togglePkg],
  );

  const handleCopy = useCallback(
    (id: number) => {
      copyPkg.mutate(id, {
        onSuccess: () => toast.success('Package copié avec succès'),
        onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
      });
    },
    [copyPkg],
  );

  const filterTabs: { key: FilterType; icon: string; label: string }[] = [
    { key: 'my-packages', icon: 'fa-user', label: 'Mes Packages' },
    { key: 'all-public', icon: 'fa-globe', label: 'Packages Publics' },
    { key: 'private', icon: 'fa-lock', label: 'Privés' },
    { key: 'public', icon: 'fa-share', label: 'Mes Publics' },
    { key: 'protected', icon: 'fa-shield-alt', label: 'Protégés' },
  ];

  if (loadingMine || loadingPublic) {
    return (
      <div className="packages-container" style={{ textAlign: 'center', padding: '4rem' }}>
        <i className="fas fa-spinner fa-spin fa-2x"></i>
      </div>
    );
  }

  return (
    <div className="packages-container">
      {/* Floating icons */}
      <i className="fas fa-box-open floating-icons float-icon-1"></i>
      <i className="fas fa-layer-group floating-icons float-icon-2"></i>
      <i className="fas fa-bookmark floating-icons float-icon-3"></i>

      {/* Header */}
      <div className="packages-header fade-in">
        <h1>
          <i className="fas fa-box-open"></i> Mes Packages
        </h1>
        <p className="header-subtitle">Organisez votre vocabulaire en packages thématiques</p>
      </div>

      {/* Action Bar — Stats */}
      <div className="action-bar fade-in">
        <div className="action-stats">
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-box"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.total}</h3>
              <p>Packages</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.public}</h3>
              <p>Publics</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-lock"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.private}</h3>
              <p>Privés</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-container fade-in">
        <div className="search-form">
          <div className="input-group">
            <input
              type="search"
              placeholder="Rechercher ..."
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="button" className="search-btn">
              <i className="fas fa-search"></i>
            </button>
          </div>
        </div>
        <button
          className="continue-application"
          onClick={() => {
            setEditPkg(null);
            setModalOpen(true);
          }}
        >
          <div>
            <div className="pencil"></div>
            <div className="folder">
              <div className="top">
                <svg viewBox="0 0 24 27">
                  <path d="M1,0 L23,0 C23.5522847,-1.01453063e-16 24,0.44771525 24,1 L24,8.17157288 C24,8.70200585 23.7892863,9.21071368 23.4142136,9.58578644 L20.5857864,12.4142136 C20.2107137,12.7892863 20,13.2979941 20,13.8284271 L20,26 C20,26.5522847 19.5522847,27 19,27 L1,27 C0.44771525,27 6.76353751e-17,26.5522847 0,26 L0,1 C-6.76353751e-17,0.44771525 0.44771525,1.01453063e-16 1,0 Z" />
                </svg>
              </div>
              <div className="paper"></div>
            </div>
          </div>
          <span>
            <div className="fas fa-plus"></div>
          </span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="filter-container fade-in">
        <div className="filter-tabs">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              className={`filter-tab${filter === tab.key ? ' active' : ''}`}
              onClick={() => setFilter(tab.key)}
            >
              <i className={`fas ${tab.icon}`}></i> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Packages Grid */}
      <div className="packages-grid fade-in">
        {filteredPackages.length > 0 ? (
          filteredPackages.map((pkg) => (
            <PackageCard
              key={pkg.package_id}
              pkg={pkg}
              isPublicView={isPublicView}
              currentUserId={user?.id ?? ''}
              onEdit={(p) => {
                setEditPkg(p);
                setModalOpen(true);
              }}
              onDelete={(id) => setDeleteId(id)}
              onToggle={handleToggle}
              onView={(id) => router.push(`/words?package=${id}`)}
              onLearn={(id) => router.push(`/learn?package=${id}`)}
              onCopy={handleCopy}
            />
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <i className={`fas ${isPublicView ? 'fa-globe' : 'fa-box-open'}`}></i>
            </div>
            <h3>{search ? 'Aucun résultat trouvé' : 'Aucun package trouvé'}</h3>
            <p>
              {search
                ? 'Essayez de modifier votre recherche ou vos filtres'
                : 'Créez votre premier package pour organiser votre vocabulaire'}
            </p>
            {!search && !isPublicView && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditPkg(null);
                  setModalOpen(true);
                }}
              >
                <i className="fas fa-plus"></i> Créer mon premier package
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <PackageModal
        open={modalOpen}
        editPkg={editPkg}
        onClose={() => {
          setModalOpen(false);
          setEditPkg(null);
        }}
        onSubmit={handleCreateOrEdit}
        saving={createPkg.isPending || updatePkg.isPending}
      />
      <DeleteModal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        saving={deletePkg.isPending}
      />
    </div>
  );
}
