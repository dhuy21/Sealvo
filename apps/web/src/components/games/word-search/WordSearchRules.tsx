export function WordSearchRules({ onStart, notice }: { onStart: () => void; notice: string }) {
  return (
    <div className="screen pre-game-screen active">
      <h2><i className="fas fa-bolt" style={{ color: '#e9e919' }}></i> Règles du jeu</h2>
      <ul className="rules-list">
        <li>Cliquez et faites glisser pour sélectionner les lettres qui forment un mot.</li>
        <li>Lorsque vous trouvez un mot, il sera marqué dans la liste.</li>
        <li>Pour un mot correct, vous gagnez 5 points par lettre.</li>
        <li>Avec un score inférieur à 100 points, pas d&apos;indice.</li>
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
