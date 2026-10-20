'use client';

import { useRouter } from 'next/navigation';
import type { PackageToReview } from '@/hooks/use-dashboard';
import styles from '@/styles/dashboard.module.css';
import { cx } from '@/lib/css-module';

export function PackagesToReview({ packages }: { packages: PackageToReview[] }) {
  const router = useRouter();

  if (packages.length === 0) {
    return (
      <div className={cx(styles, 'no-activity')}>
        <div className={cx(styles, 'no-activity-icon')}>
          <i className="fas fa-check-circle"></i>
        </div>
        <h4>Excellent travail !</h4>
        <p>Toutes vos tâches sont terminées. Vous êtes à jour dans vos révisions !</p>
      </div>
    );
  }

  return (
    <ul className={cx(styles, 'activity-list')}>
      {packages.map((pkg) => (
        <li
          key={pkg.package_id}
          className={cx(styles, 'activity-item', 'task-card')}
          onClick={() => router.push(`/words?package=${pkg.package_id}`)}
        >
          <div className={cx(styles, 'task-icon')}>📜</div>
          <div className={cx(styles, 'task-content')}>
            <div className={cx(styles, 'activity-title')}>{pkg.package_name}</div>
            <div className={cx(styles, 'activity-time')}>
              🧠
              <div className={cx(styles, 'word-count')}>{pkg.num_words}</div>
              <div className={cx(styles, 'word-label')}>mots à réviser</div>
            </div>
          </div>
          <div className={cx(styles, 'task-actions')}>
            <div className={cx(styles, 'task-priority')}>
              <div className={cx(styles, 'priority-dot')}></div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
