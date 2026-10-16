import { PlayAgainActions } from '@/components/games/PlayAgainActions';
import { TrackLevelMessage, type LevelStatus } from '@/components/games/TrackLevelMessage';
import { cx } from '@/lib/css-module';
import styles from '@/styles/games/word-scramble.module.css';

export function WordScrambleSummary({
  score,
  correctAnswers,
  accuracy,
  levelMessage,
  levelStatus,
  levelFinished,
  packageId,
  onReplay,
}: {
  score: number;
  correctAnswers: number;
  accuracy: number;
  levelMessage: string;
  levelStatus: LevelStatus;
  levelFinished: boolean;
  packageId: number;
  onReplay: () => void;
}) {
  return (
    <div className={cx(styles, 'post-game-screen', 'active')}>
      <div className={cx(styles, 'final-score-container')}>
        <div className={cx(styles, 'final-score-label')}>Score final</div>
        <span className={cx(styles, 'final-score')}>{score}</span>
      </div>

      <div className={cx(styles, 'game-summary')}>
        <div className={cx(styles, 'summary-item')}>
          <div className={cx(styles, 'summary-icon')}>🔍 Mots trouvés</div>
          <span className={cx(styles, 'summary-value')}>{correctAnswers}</span>
        </div>
        <div className={cx(styles, 'summary-item')}>
          <div className={cx(styles, 'summary-icon')}>📌 Précision</div>
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
