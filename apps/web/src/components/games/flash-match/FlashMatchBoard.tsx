import { formatTime } from '@/components/games/format-time';
import { cx } from '@/lib/css-module';
import styles from '@/styles/games/flash-match.module.css';

export interface Card {
  pairId: number;
  type: 'word' | 'meaning';
  content: string;
  flipped: boolean;
  matched: boolean;
}

export function FlashMatchBoard({
  cards,
  moves,
  currentTime,
  matchedPairs,
  totalPairs,
  onFlip,
}: {
  cards: Card[];
  moves: number;
  currentTime: number;
  matchedPairs: number;
  totalPairs: number;
  onFlip: (index: number) => void;
}) {
  const gridClass =
    totalPairs <= 4
      ? 'grid-4'
      : totalPairs <= 8
        ? 'grid-8'
        : totalPairs <= 10
          ? 'grid-10'
          : totalPairs <= 12
            ? 'grid-12'
            : 'grid-15';

  return (
    <div className={cx(styles, 'active-game-screen', 'active')}>
      <div className={cx(styles, 'game-info')}>
        <div className={cx(styles, 'moves-display')}>
          <span className={cx(styles, 'moves-label')}>Coups</span>
          <span className={cx(styles, 'moves-value')}>{moves}</span>
        </div>
        <div className={cx(styles, 'timer-display')}>
          <span className={cx(styles, 'timer-label')}>Temps</span>
          <span className={cx(styles, 'timer-value')}>{formatTime(currentTime)}</span>
        </div>
        <div className={cx(styles, 'pairs-display')}>
          <span className={cx(styles, 'pairs-label')}>Paires</span>
          <span className={cx(styles, 'pairs-value')}>
            {matchedPairs}/{totalPairs}
          </span>
        </div>
      </div>

      <div className={cx(styles, 'game-board', gridClass)}>
        {cards.map((card, i) => (
          <div
            key={i}
            className={cx(styles, 'card-container', card.flipped && 'flipped', card.matched && 'matched')}
            onClick={() => onFlip(i)}
          >
            <div className={cx(styles, 'card-inner')}>
              <div className={cx(styles, 'card-front')}></div>
              <div className={cx(styles, 'card-back')}>
                {card.type === 'meaning' ? (
                  <div className={cx(styles, 'meaning-card')}>{card.content}</div>
                ) : (
                  <div className={cx(styles, 'card-word')}>{card.content}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
