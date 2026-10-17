'use client';

import { useRouter } from 'next/navigation';
import type { Package } from '@/hooks/use-packages';
import { PackageCard } from './PackageCard';
import styles from '@/styles/packages.module.css';
import { cx } from '@/lib/css-module';

export function PackagesGrid({
  packages,
  isPublicView,
  search,
  currentUserId,
  onCreate,
  onEdit,
  onDelete,
  onToggle,
  onCopy,
}: {
  packages: Package[];
  isPublicView: boolean;
  search: string;
  currentUserId: string;
  onCreate: () => void;
  onEdit: (pkg: Package) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number) => void;
  onCopy: (id: number) => void;
}) {
  const router = useRouter();

  return (
    <div className={cx(styles, 'packages-grid', 'fade-in')}>
      {packages.length > 0 ? (
        packages.map((pkg) => (
          <PackageCard
            key={pkg.package_id}
            pkg={pkg}
            isPublicView={isPublicView}
            currentUserId={currentUserId}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggle={onToggle}
            onView={(id) => router.push(`/words?package=${id}`)}
            onLearn={(id) => router.push(`/learn?package=${id}`)}
            onCopy={onCopy}
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
            <button className={cx(styles, 'btn', 'btn-primary')} onClick={onCreate}>
              <i className="fas fa-plus"></i> Créer mon premier package
            </button>
          )}
        </div>
      )}
    </div>
  );
}
