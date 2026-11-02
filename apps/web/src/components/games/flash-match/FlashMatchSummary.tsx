import { PlayAgainActions } from '@/components/games/PlayAgainActions';
import { formatTime } from '@/components/games/format-time';
import { TrackLevelMessage, type LevelStatus } from '@/components/games/TrackLevelMessage';
import { cx } from '@/lib/css-module';
import styles from '@/styles/games/flash-match.module.css';

export function FlashMatchSummary({
  matchedPairs,
  currentTime,
  moves,
  levelMessage,
  levelStatus,
  levelFinished,
  packageId,
  onReplay,
}: {
  matchedPairs: number;
  currentTime: number;
  moves: number;
  levelMessage: string;
  levelStatus: LevelStatus;
  levelFinished: boolean;
  packageId: number;
  onReplay: () => void;
}) {
  return (
    <div className={cx(styles, 'post-game-screen', 'active')}>
      <div className={cx(styles, 'final-score-container')}>
        <div className={cx(styles, 'final-score-label')}>Paires trouvées</div>
        <span className={cx(styles, 'final-score')}>{matchedPairs}</span>
      </div>
      <div className={cx(styles, 'game-summary')}>
        <div className={cx(styles, 'summary-item')}>
          <div className={cx(styles, 'summary-icon')}>⏱️ Temps</div>
          <span className={cx(styles, 'summary-value')}>{formatTime(currentTime)}</span>
        </div>
        <div className={cx(styles, 'summary-item')}>
          <div className={cx(styles, 'summary-icon')}>🎯 Coups</div>
          <span className={cx(styles, 'summary-value')}>{moves}</span>
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
