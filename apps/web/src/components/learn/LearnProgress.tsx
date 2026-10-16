export function LearnProgress({
  progress,
  reviewCount,
  knownCount,
}: {
  progress: string;
  reviewCount: number;
  knownCount: number;
}) {
  return (
    <div className="progress-container">
      <div className="progress-header">
        <h3>Votre progression</h3>
        <span>{progress}%</span>
      </div>
      <div className="progress-bar">
        <div className="progress" style={{ width: `${progress}%` }}></div>
      </div>
      <div className="progress-stats">
        <div className="progress-stat">
          <span className="stat-icon red">
            <i className="fas fa-redo"></i>
          </span>
          <span>{reviewCount}</span>
        </div>
        <div className="progress-stat">
          <span className="stat-icon green">
            <i className="fas fa-check"></i>
          </span>
          <span>{knownCount}</span>
        </div>
      </div>
    </div>
  );
}
