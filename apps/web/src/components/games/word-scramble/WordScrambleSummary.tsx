import { TrackLevelMessage, type LevelStatus } from '@/components/games/TrackLevelMessage';

export function WordScrambleSummary({
  score,
  correctAnswers,
  accuracy,
  levelMessage,
  levelStatus,
  onReplay,
}: {
  score: number;
  correctAnswers: number;
  accuracy: number;
  levelMessage: string;
  levelStatus: LevelStatus;
  onReplay: () => void;
}) {
  return (
    <div className="post-game-screen active">
      <div className="final-score-container">
        <div className="final-score-label">Score final</div>
        <span className="final-score">{score}</span>
      </div>

      <div className="game-summary">
        <div className="summary-item">
          <div className="summary-icon">🔍 Mots trouvés</div>
          <span className="summary-value">{correctAnswers}</span>
        </div>
        <div className="summary-item">
          <div className="summary-icon">📌 Précision</div>
          <span className="summary-value">{accuracy}%</span>
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
