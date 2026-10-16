import { TrackLevelMessage, type LevelStatus } from '@/components/games/TrackLevelMessage';

export function PhraseCompletionSummary({
  score,
  correctAnswers,
  totalQuestions,
  bestStreak,
  levelMessage,
  levelStatus,
  onReplay,
}: {
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  bestStreak: number;
  levelMessage: string;
  levelStatus: LevelStatus;
  onReplay: () => void;
}) {
  return (
    <div className="screen post-game-screen active">
      <div className="final-score-container">
        <div className="final-score-label">Score final</div>
        <span className="final-score">{score}</span>
      </div>

      <div className="game-summary">
        <div className="summary-item">
          <div className="summary-icon">👑 Corrects</div>
          <span className="summary-value">{correctAnswers}/{totalQuestions}</span>
        </div>
        <div className="summary-item">
          <div className="summary-icon">🧠 Série</div>
          <span className="summary-value">{bestStreak}</span>
        </div>
      </div>

      <TrackLevelMessage message={levelMessage} status={levelStatus} />

      <div className="action-buttons">
        <button className="play-again-btn" onClick={onReplay}>
          <i className="fas fa-redo"></i> Rejouer
        </button>
      </div>
    </div>
  );
}
