import { cx } from '@/lib/css-module';
import styles from '@/styles/learn.module.css';

export function EmptyFlashcard() {
  return (
    <div className={cx(styles, 'flashcard')}>
      <div className={cx(styles, 'flashcard-inner')}>
        <div className={cx(styles, 'flashcard-front')}>
          <h2 className={cx(styles, 'card-content')}>Aucun mot disponible</h2>
          <p className={cx(styles, 'card-prompt')}>Ajustez vos filtres ou ajoutez plus de mots</p>
        </div>
      </div>
    </div>
  );
}
