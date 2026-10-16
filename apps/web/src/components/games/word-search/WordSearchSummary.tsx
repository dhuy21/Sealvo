import { PlayAgainActions } from '@/components/games/PlayAgainActions';
import { TrackLevelMessage, type LevelStatus } from '@/components/games/TrackLevelMessage';
import { cx } from '@/lib/css-module';
import styles from '@/styles/games/word-search.module.css';

export function WordSearchSummary({
  finalScore,
  foundCount,
  accuracy,
  levelMessage,
  levelStatus,
  levelFinished,
  packageId,
  onReplay,
}: {
  finalScore: number;
  foundCount: number;
  accuracy: number;
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
        <span className={cx(styles, 'final-score')}>{finalScore}</span>
      </div>

      <div className={cx(styles, 'game-summary')}>
        <div className={cx(styles, 'summary-item')}>
          <div className={cx(styles, 'summary-icon')}>⏰ Mots trouvés</div>
          <span className={cx(styles, 'summary-value')}>{foundCount}</span>
        </div>
        <div className={cx(styles, 'summary-item')}>
          <div className={cx(styles, 'summary-icon')}>👾 Précision</div>
          <span className={cx(styles, 'summary-value')}>{accuracy}%</span>
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
