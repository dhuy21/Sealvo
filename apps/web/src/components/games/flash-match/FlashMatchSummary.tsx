import { formatTime } from '@/components/games/format-time';
import { TrackLevelMessage, type LevelStatus } from '@/components/games/TrackLevelMessage';

export function FlashMatchSummary({
  matchedPairs,
  currentTime,
  moves,
  levelMessage,
  levelStatus,
  onReplay,
}: {
  matchedPairs: number;
  currentTime: number;
  moves: number;
  levelMessage: string;
  levelStatus: LevelStatus;
  onReplay: () => void;
}) {
  return (
    <div className="post-game-screen active">
      <div className="final-score-container">
        <div className="final-score-label">Paires trouvées</div>
        <span className="final-score">{matchedPairs}</span>
      </div>
      <div className="game-summary">
        <div className="summary-item">
          <div className="summary-icon">⏱️ Temps</div>
          <span className="summary-value">{formatTime(currentTime)}</span>
        </div>
        <div className="summary-item">
          <div className="summary-icon">🎯 Coups</div>
          <span className="summary-value">{moves}</span>
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
