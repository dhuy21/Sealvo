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
        <li>Le score est le nombre de paires trouvées</li>
        <li>Le temps et le nombre de coups s&apos;affichent à la fin, sans changer le score</li>
        <li>Trouvez toutes les paires pour terminer le jeu</li>
      </ul>
      <button className={cx(styles, 'start-btn')} onClick={onStart}>
        <i className="fas fa-play"></i> Commencer
      </button>
    </div>
  );
}
