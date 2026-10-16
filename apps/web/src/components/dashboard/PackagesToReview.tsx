'use client';

import { useRouter } from 'next/navigation';
import type { PackageToReview } from '@/hooks/use-dashboard';

export function PackagesToReview({ packages }: { packages: PackageToReview[] }) {
  const router = useRouter();

  if (packages.length === 0) {
    return (
      <div className="no-activity">
        <div className="no-activity-icon">
          <i className="fas fa-check-circle"></i>
        </div>
        <h4>Excellent travail !</h4>
        <p>Toutes vos tâches sont terminées. Vous êtes à jour dans vos révisions !</p>
      </div>
    );
  }

  return (
    <ul className="activity-list">
      {packages.map((pkg) => (
        <li
          key={pkg.package_id}
          className="activity-item task-card"
          onClick={() => router.push(`/words?package=${pkg.package_id}`)}
        >
          <div className="task-icon">📜</div>
          <div className="task-content">
            <div className="activity-title">{pkg.package_name}</div>
            <div className="activity-time">
              🧠
              <div className="word-count">{pkg.num_words}</div>
              <div className="word-label">mots à réviser</div>
            </div>
          </div>
          <div className="task-actions">
            <div className="task-priority">
              <div className="priority-dot"></div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
