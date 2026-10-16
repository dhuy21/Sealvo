export function GameStats({ wordCount }: { wordCount: number }) {
  return (
    <div className="game-stats">
      <div className="stat-box">
        <span className="stat-label">Mots disponibles</span>
        <span className="stat-value">{wordCount}</span>
      </div>
    </div>
  );
}
