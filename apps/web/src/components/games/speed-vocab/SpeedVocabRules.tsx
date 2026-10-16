export function SpeedVocabRules({ onStart }: { onStart: () => void }) {
  return (
    <div className="pre-game-screen active">
      <h2><i className="fas fa-bolt"></i> Règles du jeu</h2>
      <ul className="rules-list">
        <li>Un mot et sa signification s&apos;affichent</li>
        <li>Tapez le mot le plus vite possible</li>
        <li>10 points par mot + bonus de longueur et série</li>
        <li>Le temps est limité !</li>
      </ul>
      <button className="start-btn" onClick={onStart}>
        <i className="fas fa-play"></i> Commencer
      </button>
    </div>
  );
}
