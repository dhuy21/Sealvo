import { formatTime } from '@/components/games/format-time';

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
    <div className="active-game-screen active">
      <div className="game-info">
        <div className="moves-display">
          <span className="moves-label">Coups</span>
          <span className="moves-value">{moves}</span>
        </div>
        <div className="timer-display">
          <span className="timer-label">Temps</span>
          <span className="timer-value">{formatTime(currentTime)}</span>
        </div>
        <div className="pairs-display">
          <span className="pairs-label">Paires</span>
          <span className="pairs-value">
            {matchedPairs}/{totalPairs}
          </span>
        </div>
      </div>

      <div className={`game-board ${gridClass}`}>
        {cards.map((card, i) => (
          <div
            key={i}
            className={`card-container${card.flipped ? ' flipped' : ''}${card.matched ? ' matched' : ''}`}
            onClick={() => onFlip(i)}
          >
            <div className="card-inner">
              <div className="card-front"></div>
              <div className="card-back">
                {card.type === 'meaning' ? (
                  <div className="meaning-card">{card.content}</div>
                ) : (
                  <div className="card-word">{card.content}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
