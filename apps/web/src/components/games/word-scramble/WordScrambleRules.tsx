export function WordScrambleRules({ onStart }: { onStart: () => void }) {
  return (
    <div className="pre-game-screen active">
      <h2><i className="fas fa-bolt"></i> Règles du jeu</h2>
      <ul className="rules-list">
        <li>Les lettres des mots ont été mélangées</li>
        <li>Retrouvez les mots originaux en réorganisant les lettres</li>
        <li>Obtenez 10 points pour chaque mot correct</li>
        <li>Vous avez le temps de trouver le plus de mots possible</li>
      </ul>
      <button className="start-btn" onClick={onStart}>
        <i className="fas fa-play"></i> Commencer
      </button>
    </div>
  );
}
