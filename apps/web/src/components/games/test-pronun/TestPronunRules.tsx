import { cx } from '@/lib/css-module';
import styles from '@/styles/games/test-pronun.module.css';

export function TestPronunRules({ onStart }: { onStart: () => void }) {
  return (
    <div className={cx(styles, 'pre-game-screen', 'active')}>
      <h2>
        <i className="fas fa-bolt" style={{ color: '#e9e919' }}></i>
        Règles du jeu
      </h2>
      <ul className={cx(styles, 'rules-list')}>
        <li>Écoutez attentivement la prononciation du mot</li>
        <li>Cliquez sur le bouton microphone pour enregistrer votre prononciation</li>
        <li>Utilisez le microphone pour bien prononcer</li>
      </ul>
      <button className={cx(styles, 'start-btn')} onClick={onStart}>
        <i className="fas fa-play"></i> Commencer
      </button>
    </div>
  );
}
