import { formatTime } from '@/components/games/format-time';
import { AnimatedCounter } from './AnimatedCounter';
import { cx } from '@/lib/css-module';
import styles from '@/styles/learn.module.css';

export function LearnStats({
  available,
  known,
  sessionTime,
}: {
  available: number;
  known: number;
  sessionTime: number;
}) {
  return (
    <div className={cx(styles, 'dashboard-stats')}>
      <div className={cx(styles, 'stat-card')}>
        <div className={cx(styles, 'stat-icon')}>
          <i className="fas fa-book"></i>
        </div>
        <div className={cx(styles, 'stat-content')}>
          <h3>{available}</h3>
          <p>Mots disponibles</p>
        </div>
      </div>
      <div className={cx(styles, 'stat-card')}>
        <div className={cx(styles, 'stat-icon')}>
          <i className="fas fa-check-circle"></i>
        </div>
        <div className={cx(styles, 'stat-content')}>
          <h3>
            <AnimatedCounter value={known} />
          </h3>
          <p>Mots maîtrisés</p>
        </div>
      </div>
      <div className={cx(styles, 'stat-card')}>
        <div className={cx(styles, 'stat-icon')}>
          <i className="fas fa-stopwatch"></i>
        </div>
        <div className={cx(styles, 'stat-content')}>
          <h3>{formatTime(sessionTime)}</h3>
          <p>Temps de session</p>
        </div>
      </div>
    </div>
  );
}
