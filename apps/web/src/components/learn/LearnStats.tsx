import { formatTime } from '@/components/games/format-time';

export function LearnStats({
  available,
  known,
  sessionTime,
}: {
  available: number;
  known: number;
  sessionTime: number;
}) {
  return (
    <div className="dashboard-stats">
      <div className="stat-card">
        <div className="stat-icon">
          <i className="fas fa-book"></i>
        </div>
        <div className="stat-content">
          <h3>{available}</h3>
          <p>Mots disponibles</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">
          <i className="fas fa-check-circle"></i>
        </div>
        <div className="stat-content">
          <h3>{known}</h3>
          <p>Mots maîtrisés</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">
          <i className="fas fa-stopwatch"></i>
        </div>
        <div className="stat-content">
          <h3>{formatTime(sessionTime)}</h3>
          <p>Temps de session</p>
        </div>
      </div>
    </div>
  );
}
