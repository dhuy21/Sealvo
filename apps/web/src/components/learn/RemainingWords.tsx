import type { CardProgress } from './deck';
import type { ReviewWord } from './use-review-words';
import { cx } from '@/lib/css-module';
import styles from '@/styles/learn.module.css';

/** Chips for the cards marked "À revoir"; clicking one jumps to that card. */
export function RemainingWords({
  deck,
  progress,
  onJump,
}: {
  deck: ReviewWord[];
  progress: CardProgress[];
  onJump: (index: number) => void;
}) {
  const items = deck.flatMap((w, index) =>
    progress[index] === 0 ? [{ index, word: w.word }] : [],
  );

  return (
    <div className={cx(styles, 'remaining-words')}>
      {items.length > 0 && (
        <>
          <h4>À revoir ({items.length})</h4>
          <div className={cx(styles, 'word-chips')}>
            {items.map((item) => (
              <span
                key={item.index}
                className={cx(styles, 'word-chip', 'chip-review')}
                onClick={() => onJump(item.index)}
              >
                {item.word}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
