import { cx } from '@/lib/css-module';
import styles from '@/styles/games/speed-vocab.module.css';

export function SpeedVocabRules({ onStart }: { onStart: () => void }) {
  return (
    <div className={cx(styles, 'screen', 'pre-game-screen', 'active')}>
      <h2>
        <i className="fas fa-bolt" style={{ color: '#e9e919' }}></i> Règles du jeu
      </h2>
      <ul className={cx(styles, 'rules-list')}>
        <li>Tapez le mot exactement comme il apparaît</li>
        <li>Obtenez 10 points pour chaque bonne réponse</li>
        <li>Perdez 5 points pour chaque réponse erronée</li>
        <li>Attention à la vitesse !</li>
      </ul>
      <button className={cx(styles, 'start-btn')} onClick={onStart}>
        <i className="fas fa-play"></i> Commencer
      </button>
    </div>
  );
}
