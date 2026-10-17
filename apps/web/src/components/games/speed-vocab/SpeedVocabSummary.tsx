import { PlayAgainActions } from '@/components/games/PlayAgainActions';
import { TrackLevelMessage, type LevelStatus } from '@/components/games/TrackLevelMessage';
import { cx } from '@/lib/css-module';
import styles from '@/styles/games/speed-vocab.module.css';

export function SpeedVocabSummary({
  score,
  bestStreak,
  wpm,
  levelMessage,
  levelStatus,
  levelFinished,
  packageId,
  onReplay,
}: {
  score: number;
  bestStreak: number;
  wpm: number;
  levelMessage: string;
  levelStatus: LevelStatus;
  levelFinished: boolean;
  packageId: number;
  onReplay: () => void;
}) {
  return (
    <div className={cx(styles, 'screen', 'post-game-screen', 'active')}>
      <div className={cx(styles, 'final-score-container')}>
        <div className={cx(styles, 'final-score-label')}>Score final</div>
        <span id="final-score" className={cx(styles, 'final-score')}>
          {score}
        </span>
      </div>

      <div className={cx(styles, 'game-summary')}>
        <div className={cx(styles, 'summary-item')}>
          <div className={cx(styles, 'summary-icon')}>💣 Série max</div>
          <span id="best-streak" className={cx(styles, 'summary-value')}>
            {bestStreak}
          </span>
        </div>
        <div className={cx(styles, 'summary-item')}>
          <div className={cx(styles, 'summary-icon')}>🚀 Mots/min</div>
          <span id="wpm" className={cx(styles, 'summary-value')}>
            {wpm}
          </span>
        </div>
      </div>

      <TrackLevelMessage message={levelMessage} status={levelStatus} styles={styles} />

      <PlayAgainActions
        levelFinished={levelFinished}
        packageId={packageId}
        onReplay={onReplay}
        styles={styles}
      />
    </div>
  );
}
