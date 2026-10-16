import { cx } from '@/lib/css-module';
import styles from '@/styles/games/word-search.module.css';

export function WordSearchRules({ onStart, disabled }: { onStart: () => void; disabled: boolean }) {
  return (
    <div className={cx(styles, 'screen', 'pre-game-screen', 'active')}>
      <h2><i className="fas fa-bolt" style={{ color: '#e9e919' }}></i> Règles du jeu</h2>
      <ul className={cx(styles, 'rules-list')}>
        <li>Cliquez et faites glisser pour sélectionner les lettres qui forment un mot.</li>
        <li>Lorsque vous trouvez un mot, il sera marqué dans la liste de droite.</li>
        <li>Pour un mot correct, vous gagnez 5 points par lettre.</li>
        <li>Avec un score inférieur à 100 points, vous n&apos;aurez pas accès à un indice.</li>
      </ul>
      <button
        className={cx(styles, 'start-btn', disabled && 'disabled')}
        onClick={onStart}
        disabled={disabled}
      >
        <i className="fas fa-play"></i> Commencer
      </button>
    </div>
  );
}
