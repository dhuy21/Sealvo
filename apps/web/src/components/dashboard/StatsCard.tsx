import type { DashboardStats } from '@/hooks/use-dashboard';
import styles from '@/styles/dashboard.module.css';
import { cx } from '@/lib/css-module';

export function StatsCard({ stats }: { stats: DashboardStats }) {
  return (
    <div className={cx(styles, 'dashboard-card', 'fade-in')}>
      <h2>
        <i
          className="fas fa-chart-pie"
          style={{ color: '#C850C0', marginRight: '0.5rem' }}
        ></i>
        Mes Statistiques
      </h2>
      <div className={cx(styles, 'stats')}>
        <div className={cx(styles, 'stat-item')}>
          <div className={cx(styles, 'stat-number')}>{stats.totalWords}</div>
          <div className={cx(styles, 'stat-label')}>Mots Totaux</div>
        </div>
        <div className={cx(styles, 'stat-item')}>
          <div className={cx(styles, 'stat-number')}>{stats.learnedWords}</div>
          <div className={cx(styles, 'stat-label')}>Mots Maîtrisés</div>
        </div>
        <div className={cx(styles, 'stat-item')}>
          <div className={cx(styles, 'stat-number')}>{stats.islearningWords}</div>
          <div className={cx(styles, 'stat-label')}>En Apprentissage</div>
        </div>
        <div className={cx(styles, 'stat-item')}>
          <div className={cx(styles, 'stat-number')}>{stats.newWords}</div>
          <div className={cx(styles, 'stat-label')}>Nouveaux Mots</div>
        </div>
      </div>
    </div>
  );
}
