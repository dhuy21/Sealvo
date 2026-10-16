'use client';

import { useState, useMemo, useCallback } from 'react';
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
import { getApiErrorMessage } from '@/lib/api-error';
import toast from 'react-hot-toast';
import { PackageModal } from '@/components/packages/PackageModal';
import { DeleteModal } from '@/components/packages/DeleteModal';
import { PackageCard } from '@/components/packages/PackageCard';
import styles from '@/styles/packages.module.css';
import { cx } from '@/lib/css-module';

type FilterType = 'my-packages' | 'all-public' | 'private' | 'public' | 'protected';

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
            onError: (err) => toast.error(getApiErrorMessage(err, 'Erreur')),
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
            onError: (err) => toast.error(getApiErrorMessage(err, 'Erreur')),
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
      onError: (err) => toast.error(getApiErrorMessage(err, 'Erreur')),
    });
  }, [deleteId, deletePkg]);

  const handleToggle = useCallback(
    (id: number) => {
      togglePkg.mutate(id, {
        onSuccess: (data) => {
          toast.success(data.isActive ? 'Package activé' : 'Package désactivé');
        },
        onError: (err) => toast.error(getApiErrorMessage(err, 'Erreur')),
      });
    },
    [togglePkg],
  );

  const handleCopy = useCallback(
    (id: number) => {
      copyPkg.mutate(id, {
        onSuccess: () => toast.success('Package copié avec succès'),
        onError: (err) => toast.error(getApiErrorMessage(err, 'Erreur')),
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
      <div
        className={cx(styles, 'packages-container')}
        style={{ textAlign: 'center', padding: '4rem' }}
      >
        <i className="fas fa-spinner fa-spin fa-2x"></i>
      </div>
    );
  }

  return (
    <div className={cx(styles, 'packages-container')}>
      {/* Floating icons */}
      <i className={cx(styles, 'fas', 'fa-box-open', 'floating-icons', 'float-icon-1')}></i>
      <i className={cx(styles, 'fas', 'fa-layer-group', 'floating-icons', 'float-icon-2')}></i>
      <i className={cx(styles, 'fas', 'fa-bookmark', 'floating-icons', 'float-icon-3')}></i>

      {/* Header */}
      <div className={cx(styles, 'packages-header', 'fade-in')}>
        <h1>
          <i className="fas fa-box-open"></i> Mes Packages
        </h1>
        <p className={cx(styles, 'header-subtitle')}>
          Organisez votre vocabulaire en packages thématiques
        </p>
      </div>

      {/* Action Bar — Stats */}
      <div className={cx(styles, 'action-bar', 'fade-in')}>
        <div className={cx(styles, 'action-stats')}>
          <div className={cx(styles, 'stat-card')}>
            <div className={cx(styles, 'stat-icon')}>
              <i className="fas fa-box"></i>
            </div>
            <div className={cx(styles, 'stat-content')}>
              <h3>{stats.total}</h3>
              <p>Packages</p>
            </div>
          </div>
          <div className={cx(styles, 'stat-card')}>
            <div className={cx(styles, 'stat-icon')}>
              <i className="fas fa-users"></i>
            </div>
            <div className={cx(styles, 'stat-content')}>
              <h3>{stats.public}</h3>
              <p>Publics</p>
            </div>
          </div>
          <div className={cx(styles, 'stat-card')}>
            <div className={cx(styles, 'stat-icon')}>
              <i className="fas fa-lock"></i>
            </div>
            <div className={cx(styles, 'stat-content')}>
              <h3>{stats.private}</h3>
              <p>Privés</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className={cx(styles, 'search-container', 'fade-in')}>
        <div className={cx(styles, 'search-form')}>
          <div className={cx(styles, 'input-group')}>
            <input
              type="search"
              placeholder="Rechercher ..."
              className={cx(styles, 'search-input')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="button" className={cx(styles, 'search-btn')}>
              <i className="fas fa-search"></i>
            </button>
          </div>
        </div>
        <button
          className={cx(styles, 'continue-application')}
          onClick={() => {
            setEditPkg(null);
            setModalOpen(true);
          }}
        >
          <div>
            <div className={cx(styles, 'pencil')}></div>
            <div className={cx(styles, 'folder')}>
              <div className={cx(styles, 'top')}>
                <svg viewBox="0 0 24 27">
                  <path d="M1,0 L23,0 C23.5522847,-1.01453063e-16 24,0.44771525 24,1 L24,8.17157288 C24,8.70200585 23.7892863,9.21071368 23.4142136,9.58578644 L20.5857864,12.4142136 C20.2107137,12.7892863 20,13.2979941 20,13.8284271 L20,26 C20,26.5522847 19.5522847,27 19,27 L1,27 C0.44771525,27 6.76353751e-17,26.5522847 0,26 L0,1 C-6.76353751e-17,0.44771525 0.44771525,1.01453063e-16 1,0 Z" />
                </svg>
              </div>
              <div className={cx(styles, 'paper')}></div>
            </div>
          </div>
          <span>
            <div className="fas fa-plus"></div>
          </span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className={cx(styles, 'filter-container', 'fade-in')}>
        <div className={cx(styles, 'filter-tabs')}>
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              className={cx(styles, 'filter-tab', filter === tab.key && 'active')}
              onClick={() => setFilter(tab.key)}
            >
              <i className={`fas ${tab.icon}`}></i> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Packages Grid */}
      <div className={cx(styles, 'packages-grid', 'fade-in')}>
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
          <div className={cx(styles, 'empty-state')}>
            <div className={cx(styles, 'empty-icon')}>
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
                className={cx(styles, 'btn', 'btn-primary')}
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
