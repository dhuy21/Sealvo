import { PlayAgainActions } from '@/components/games/PlayAgainActions';
import { TrackLevelMessage, type LevelStatus } from '@/components/games/TrackLevelMessage';
import { formatTime } from './pronunciation';
import { cx } from '@/lib/css-module';
import styles from '@/styles/games/test-pronun.module.css';

export function TestPronunSummary({
  perfectCount,
  elapsed,
  avgAccuracy,
  levelMessage,
  levelStatus,
  levelFinished,
  packageId,
  onReplay,
}: {
  perfectCount: number;
  elapsed: number;
  avgAccuracy: number;
  levelMessage: string;
  levelStatus: LevelStatus;
  levelFinished: boolean;
  packageId: number;
  onReplay: () => void;
}) {
  return (
    <div className={cx(styles, 'post-game-screen', 'active')}>
      <div className={cx(styles, 'final-score-container')}>
        <div className={cx(styles, 'final-score-label')}>Prononciations parfaites</div>
        <span className={cx(styles, 'final-score')}>{perfectCount}</span>
      </div>

      <div className={cx(styles, 'game-summary')}>
        <div className={cx(styles, 'summary-item')}>
          <div className={cx(styles, 'summary-icon')}>⏳ Temps</div>
          <span className={cx(styles, 'summary-value')}>{formatTime(elapsed)}</span>
        </div>
        <div className={cx(styles, 'summary-item')}>
          <div className={cx(styles, 'summary-icon')}>🌞 Précision moyenne</div>
          <span className={cx(styles, 'summary-value')}>{avgAccuracy}%</span>
        </div>
      </div>

      <TrackLevelMessage message={levelMessage} status={levelStatus} styles={styles} />

      <PlayAgainActions
        levelFinished={levelFinished}
        packageId={packageId}
        onReplay={onReplay}
        replayLabel="Réessayer"
        styles={styles}
      />
    </div>
  );
}
