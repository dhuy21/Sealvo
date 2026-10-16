import { TrackLevelMessage, type LevelStatus } from '@/components/games/TrackLevelMessage';

export function SpeedVocabSummary({
  score,
  bestStreak,
  wpm,
  levelMessage,
  levelStatus,
  onReplay,
}: {
  score: number;
  bestStreak: number;
  wpm: number;
  levelMessage: string;
  levelStatus: LevelStatus;
  onReplay: () => void;
}) {
  return (
    <div className="post-game-screen active">
      <div className="final-score-container">
        <div className="final-score-label">Score final</div>
        <span id="final-score" className="final-score">{score}</span>
      </div>

      <div className="game-summary">
        <div className="summary-item">
          <div className="summary-icon">🔥 Meilleure série</div>
          <span id="best-streak" className="summary-value">{bestStreak}</span>
        </div>
        <div className="summary-item">
          <div className="summary-icon">⚡ Mots/min</div>
          <span id="wpm" className="summary-value">{wpm}</span>
        </div>
      </div>

      <TrackLevelMessage message={levelMessage} status={levelStatus} />

      <div id="play-again-container" className="action-buttons">
        <button id="play-again" className="play-again-btn" onClick={onReplay}>
          <i className="fas fa-redo"></i> Rejouer
        </button>
      </div>
    </div>
  );
}
