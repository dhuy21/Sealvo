import styles from '@/styles/packages.module.css';
import { cx } from '@/lib/css-module';

const STATS = [
  { key: 'total', icon: 'fa-box', label: 'Packages' },
  { key: 'public', icon: 'fa-users', label: 'Publics' },
  { key: 'private', icon: 'fa-lock', label: 'Privés' },
] as const;

export function PackagesStatsBar({
  stats,
}: {
  stats: Record<(typeof STATS)[number]['key'], number>;
}) {
  return (
    <div className={cx(styles, 'action-bar', 'fade-in')}>
      <div className={cx(styles, 'action-stats')}>
        {STATS.map(({ key, icon, label }) => (
          <div key={key} className={cx(styles, 'stat-card')}>
            <div className={cx(styles, 'stat-icon')}>
              <i className={`fas ${icon}`}></i>
            </div>
            <div className={cx(styles, 'stat-content')}>
              <h3>{stats[key]}</h3>
              <p>{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
