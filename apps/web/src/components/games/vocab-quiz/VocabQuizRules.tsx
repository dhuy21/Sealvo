import { cx } from '@/lib/css-module';
import styles from '@/styles/games/vocab-quiz.module.css';

export function VocabQuizRules({ onStart }: { onStart: () => void }) {
  return (
    <div className={cx(styles, 'pre-game-screen', 'active')}>
      <h2>
        <i className="fas fa-bolt" style={{ color: '#e9e919' }}></i> Règles du jeu
      </h2>
      <ul className={cx(styles, 'rules-list')}>
        <li>Choisissez la bonne définition pour chaque mot</li>
        <li>Obtenez 10 points pour chaque bonne réponse</li>
        <li>Perdez 5 points pour chaque réponse erronée</li>
        <li>Répondez à toutes les questions pour terminer le quiz</li>
      </ul>
      <button className={cx(styles, 'start-btn')} onClick={onStart}>
        <i className="fas fa-play"></i> Commencer
      </button>
    </div>
  );
}
