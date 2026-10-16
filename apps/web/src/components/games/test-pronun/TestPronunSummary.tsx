import { TrackLevelMessage, type LevelStatus } from '@/components/games/TrackLevelMessage';
import { formatTime } from './pronunciation';

export function TestPronunSummary({
  perfectCount,
  elapsed,
  avgAccuracy,
  levelMessage,
  levelStatus,
  onReplay,
}: {
  perfectCount: number;
  elapsed: number;
  avgAccuracy: number;
  levelMessage: string;
  levelStatus: LevelStatus;
  onReplay: () => void;
}) {
  return (
    <div className="post-game-screen active">
      <div className="final-score-container">
        <div className="final-score-label">Prononciations parfaites</div>
        <span className="final-score">{perfectCount}</span>
      </div>

      <div className="game-summary">
        <div className="summary-item">
          <div className="summary-icon">⏳ Temps</div>
          <span className="summary-value">{formatTime(elapsed)}</span>
        </div>
        <div className="summary-item">
          <div className="summary-icon">🌞 Précision moyenne</div>
          <span className="summary-value">{avgAccuracy}%</span>
        </div>
      </div>

      <TrackLevelMessage message={levelMessage} status={levelStatus} />

      <div className="action-buttons">
        <button className="play-again-btn" onClick={onReplay}>
          <i className="fas fa-redo"></i> Réessayer
        </button>
      </div>
    </div>
  );
}
