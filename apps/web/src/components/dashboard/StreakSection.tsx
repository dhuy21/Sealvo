export function StreakSection({ streak }: { streak: number }) {
  const maxDays = 30;
  const fireStreak = Math.floor(streak / maxDays) * maxDays;
  const remainder = streak % maxDays;
  const percent = Math.min((remainder / maxDays) * 100, 100);

  return (
    <div className="dashboard-card fade-in">
      <div className="text-center">
        <div className="streak-display">
          <div className="progress-container fade-in">
            <h3>
              <i className="fas fa-fire" style={{ color: '#F59E0B', marginRight: '0.5rem' }}></i>
              Séries d&apos;Apprentissage
            </h3>
            <div className="fire-section">
              <div className="fire">
                <div className="fire-left">
                  <div className="main-fire"></div>
                  <div className="particle-fire"></div>
                </div>
                <div className="fire-center">
                  <div className="main-fire"></div>
                  <div className="particle-fire"></div>
                </div>
                <div className="fire-right">
                  <div className="main-fire"></div>
                  <div className="particle-fire"></div>
                </div>
                <div className="fire-bottom">
                  <div className="main-fire"></div>
                </div>
                <div className="fire-streak-text" id="fireStreakText">
                  {fireStreak}
                </div>
              </div>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${percent}%` }}></div>
            </div>
            <div className="progress-bar-labels">
              <span>
                <i
                  className="fas fa-tachometer-alt"
                  style={{ color: '#4158D0', marginRight: '0.25rem' }}
                ></i>
                Progression
              </span>
              <span>
                <i
                  className="fas fa-trophy"
                  style={{ color: '#FFCC70', marginRight: '0.25rem' }}
                ></i>
                {remainder}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
