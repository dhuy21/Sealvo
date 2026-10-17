'use client';

import { useAuthStore } from '@/stores/auth.store';
import { useMyPackages, usePublicPackages } from '@/hooks/use-packages';
import { getApiErrorMessage } from '@/lib/api-error';
import { PackageModal } from '@/components/packages/PackageModal';
import { DeleteModal } from '@/components/packages/DeleteModal';
import { PackagesStatsBar } from '@/components/packages/PackagesStatsBar';
import { PackagesToolbar } from '@/components/packages/PackagesToolbar';
import { PackagesFilterTabs } from '@/components/packages/PackagesFilterTabs';
import { PackagesGrid } from '@/components/packages/PackagesGrid';
import { usePackageFilters } from '@/components/packages/use-package-filters';
import { usePackageActions } from '@/components/packages/use-package-actions';
import styles from '@/styles/packages.module.css';
import { cx } from '@/lib/css-module';

export default function PackagesPage() {
  const user = useAuthStore((s) => s.user);
  const mine = useMyPackages();
  const shared = usePublicPackages();
  const filters = usePackageFilters(mine.data, shared.data);
  const actions = usePackageActions();

  if (mine.isLoading || shared.isLoading) {
    return (
      <div
        className={cx(styles, 'packages-container')}
        style={{ textAlign: 'center', padding: '4rem' }}
      >
        <i className="fas fa-spinner fa-spin fa-2x"></i>
      </div>
    );
  }

  if (!mine.data || !shared.data) {
    return (
      <div
        className={cx(styles, 'packages-container')}
        style={{ textAlign: 'center', padding: '4rem' }}
      >
        <div className={cx(styles, 'empty-state')}>
          <div className={cx(styles, 'empty-icon')}>
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <p>
            {getApiErrorMessage(
              mine.error ?? shared.error,
              'Une erreur est survenue lors de la récupération de vos packages.',
            )}
          </p>
        </div>
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

      <PackagesStatsBar stats={filters.stats} />
      <PackagesToolbar
        search={filters.search}
        onSearchChange={filters.setSearch}
        onCreate={actions.openCreate}
      />
      <PackagesFilterTabs filter={filters.filter} onChange={filters.setFilter} />
      <PackagesGrid
        packages={filters.filteredPackages}
        isPublicView={filters.isPublicView}
        search={filters.search}
        currentUserId={user?.id ?? ''}
        onCreate={actions.openCreate}
        onEdit={actions.openEdit}
        onDelete={actions.askDelete}
        onToggle={actions.toggle}
        onCopy={actions.copy}
      />

      {/* Modals */}
      <PackageModal
        open={actions.modalOpen}
        editPkg={actions.editPkg}
        onClose={actions.closeModal}
        onSubmit={actions.saveModal}
        saving={actions.saving}
      />
      <DeleteModal
        open={actions.deleteId !== null}
        onClose={actions.cancelDelete}
        onConfirm={actions.confirmDelete}
        saving={actions.deleting}
      />
    </div>
  );
}
