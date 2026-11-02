'use client';

import styles from '@/styles/packages.module.css';
import { cx } from '@/lib/css-module';
import type { FilterType } from './use-package-filters';

const FILTER_TABS: { key: FilterType; icon: string; label: string }[] = [
  { key: 'my-packages', icon: 'fa-user', label: 'Mes Packages' },
  { key: 'all-public', icon: 'fa-globe', label: 'Packages Publics' },
  { key: 'private', icon: 'fa-lock', label: 'Privés' },
  { key: 'public', icon: 'fa-share', label: 'Mes Publics' },
  { key: 'protected', icon: 'fa-shield-alt', label: 'Protégés' },
];

export function PackagesFilterTabs({
  filter,
  onChange,
}: {
  filter: FilterType;
  onChange: (filter: FilterType) => void;
}) {
  return (
    <div className={cx(styles, 'filter-container', 'fade-in')}>
      <div className={cx(styles, 'filter-tabs')}>
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            className={cx(styles, 'filter-tab', filter === tab.key && 'active')}
            onClick={() => onChange(tab.key)}
          >
            <i className={`fas ${tab.icon}`}></i> {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
