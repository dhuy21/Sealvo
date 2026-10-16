import { PlayAgainActions } from '@/components/games/PlayAgainActions';
import { TrackLevelMessage, type LevelStatus } from '@/components/games/TrackLevelMessage';
import { cx } from '@/lib/css-module';
import styles from '@/styles/games/phrase-completion.module.css';

export function PhraseCompletionSummary({
  score,
  correctAnswers,
  totalQuestions,
  bestStreak,
  levelMessage,
  levelStatus,
  levelFinished,
  packageId,
  onReplay,
}: {
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  bestStreak: number;
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
        <span className={cx(styles, 'final-score')}>{score}</span>
      </div>

      <div className={cx(styles, 'game-summary')}>
        <div className={cx(styles, 'summary-item')}>
          <div className={cx(styles, 'summary-icon')}>👑 Corrects</div>
          <span className={cx(styles, 'summary-value')}>{correctAnswers}/{totalQuestions}</span>
        </div>
        <div className={cx(styles, 'summary-item')}>
          <div className={cx(styles, 'summary-icon')}>🧠 Série</div>
          <span className={cx(styles, 'summary-value')}>{bestStreak}</span>
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
