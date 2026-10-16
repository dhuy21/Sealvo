import { cx } from '@/lib/css-module';
import styles from '@/styles/games/phrase-completion.module.css';

export function PhraseCompletionRules({ onStart }: { onStart: () => void }) {
  return (
    <div className={cx(styles, 'screen', 'pre-game-screen', 'active')}>
      <h2><i className="fas fa-bolt" style={{ color: '#e9e919' }}></i> Règles du jeu</h2>
      <ul className={cx(styles, 'rules-list')}>
        <li>Complétez la phrase par les mots appris</li>
        <li>Obtenez 10 points pour chaque bonne réponse</li>
        <li>Bonus pour la rapidité et les séries</li>
        <li>Séparez les mots par le symbole ;</li>
      </ul>
      <button className={cx(styles, 'start-btn')} onClick={onStart}>
        <i className="fas fa-play"></i> Commencer
      </button>
    </div>
  );
}
