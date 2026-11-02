import styles from '@/styles/dashboard.module.css';
import { cx } from '@/lib/css-module';

export function StreakSection({ streak }: { streak: number }) {
  const maxDays = 30;
  const fireStreak = Math.floor(streak / maxDays) * maxDays;
  const remainder = streak % maxDays;
  const percent = Math.min((remainder / maxDays) * 100, 100);

  return (
    <div className={cx(styles, 'dashboard-card', 'fade-in')}>
      <div className="text-center">
        <div className={cx(styles, 'streak-display')}>
          <div className={cx(styles, 'progress-container', 'fade-in')}>
            <h3>
              <i className="fas fa-fire" style={{ color: '#F59E0B', marginRight: '0.5rem' }}></i>
              Séries d&apos;Apprentissage
            </h3>
            <div className={cx(styles, 'fire-section')}>
              <div className={cx(styles, 'fire')}>
                <div className={cx(styles, 'fire-left')}>
                  <div className={cx(styles, 'main-fire')}></div>
                  <div className={cx(styles, 'particle-fire')}></div>
                </div>
                <div className={cx(styles, 'fire-center')}>
                  <div className={cx(styles, 'main-fire')}></div>
                  <div className={cx(styles, 'particle-fire')}></div>
                </div>
                <div className={cx(styles, 'fire-right')}>
                  <div className={cx(styles, 'main-fire')}></div>
                  <div className={cx(styles, 'particle-fire')}></div>
                </div>
                <div className={cx(styles, 'fire-bottom')}>
                  <div className={cx(styles, 'main-fire')}></div>
                </div>
                <div className={cx(styles, 'fire-streak-text')} id="fireStreakText">
                  {fireStreak}
                </div>
              </div>
            </div>
            <div className={cx(styles, 'progress-bar-container')}>
              <div
                className={cx(styles, 'progress-bar-fill')}
                style={{ width: `${percent}%` }}
              ></div>
            </div>
            <div className={cx(styles, 'progress-bar-labels')}>
              <span>
                <i
                  className="fas fa-tachometer-alt"
                  style={{ color: '#4158D0', marginRight: '0.25rem' }}
                ></i>
                Progression
              </span>
              <span id="progress-percentage">
                <i
                  className="fas fa-trophy"
                  style={{ color: '#FFCC70', marginRight: '0.25rem' }}
                ></i>
                {remainder}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
