import { formatTime } from '@/components/games/format-time';
import { TrackLevelMessage, type LevelStatus } from '@/components/games/TrackLevelMessage';

export function VocabQuizSummary({
  score,
  correctCount,
  currentTime,
  levelMessage,
  levelStatus,
  onReplay,
}: {
  score: number;
  correctCount: number;
  currentTime: number;
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
          <div className="summary-icon">☘️Corrects</div>
          <span className="summary-value">{correctCount}</span>
        </div>
        <div className="summary-item">
          <div className="summary-icon">⏰Temps</div>
          <span className="summary-value">{formatTime(currentTime)}</span>
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
