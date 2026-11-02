import { cx } from '@/lib/css-module';
import styles from '@/styles/auth.module.css';

const VOCAB_CARDS = ['Ephemeral', 'Serendipity', 'Eloquent'];
const CIRCLE_COUNT = 5;

export function HeroImage() {
  return (
    <div className={styles['hero-image']}>
      <div className={styles['hero-image-container']}>
        {VOCAB_CARDS.map((word, i) => (
          <div key={word} className={cx(styles, 'floating-element', 'vocab-card', `card-${i + 1}`)}>
            <span className={styles['vocab-word']}>{word}</span>
          </div>
        ))}
        {Array.from({ length: CIRCLE_COUNT }, (_, i) => (
          <div key={i} className={cx(styles, 'floating-circle', `circle-${i + 1}`)} />
        ))}
        <div className={styles['book-icon']}>
          <i className="fas fa-book-open fa-3x" />
        </div>
      </div>
    </div>
  );
}
