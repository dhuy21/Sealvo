export function PhraseCompletionRules({ onStart, notice }: { onStart: () => void; notice: string }) {
  return (
    <div className="screen pre-game-screen active">
      <h2><i className="fas fa-bolt" style={{ color: '#e9e919' }}></i> Règles du jeu</h2>
      <ul className="rules-list">
        <li>Complétez la phrase par les mots appris</li>
        <li>Obtenez 10 points pour chaque bonne réponse</li>
        <li>Bonus pour la rapidité et les séries</li>
        <li>Séparez les mots par le symbole ;</li>
      </ul>
      {notice && (
        <div className="error-box">
          <i className="fas fa-exclamation-triangle"></i>
          <p>{notice}</p>
        </div>
      )}
      <button className="start-btn" onClick={onStart}>
        <i className="fas fa-play"></i> Commencer
      </button>
    </div>
  );
}
