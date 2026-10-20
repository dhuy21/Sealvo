import { cx } from '@/lib/css-module';
import styles from '@/styles/games/flash-match.module.css';

export function FlashMatchRules({ onStart }: { onStart: () => void }) {
  return (
    <div className={cx(styles, 'pre-game-screen', 'active')}>
      <h2>
        <i className="fas fa-bolt" style={{ color: '#e9e919' }}></i> Règles du jeu
      </h2>
      <ul className={cx(styles, 'rules-list')}>
        <li>Associez chaque mot avec sa définition</li>
        <li>Moins vous faites de tentatives, plus votre score sera élevé</li>
        <li>Le temps est également pris en compte dans le calcul du score</li>
        <li>Trouvez toutes les paires pour terminer le jeu</li>
      </ul>
      <button className={cx(styles, 'start-btn')} onClick={onStart}>
        <i className="fas fa-play"></i> Commencer
      </button>
    </div>
  );
}
