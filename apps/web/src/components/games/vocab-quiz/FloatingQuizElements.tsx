import { cx } from '@/lib/css-module';
import styles from '@/styles/games/vocab-quiz.module.css';

const SYMBOLS = ['☁️', '🌤️', '⛅', '🌥️', '🌦️', '🌈'];

/** Randomized once per page load: decorations must not move on each timer re-render. */
const ELEMENT_STYLES = SYMBOLS.map(() => ({
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  animationDelay: `${Math.random() * 5}s`,
  animationDuration: `${8 + Math.random() * 4}s`,
}));

export function FloatingQuizElements() {
  return (
    <>
      {ELEMENT_STYLES.map((style, i) => (
        <div key={i} className={cx(styles, 'floating-quiz-element')} style={style}>
          {SYMBOLS[i]}
        </div>
      ))}
    </>
  );
}
