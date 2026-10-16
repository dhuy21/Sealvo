import type { TouchEvent } from 'react';
import { GRID_SIZE, cellKey } from './grid';

export function WordSearchBoard({
  score,
  timer,
  wordsToFind,
  foundWords,
  grid,
  foundCells,
  selectedSet,
  onHint,
  onCellMouseDown,
  onCellMouseOver,
  onSelectionEnd,
  onTouchMove,
}: {
  score: number;
  timer: number;
  wordsToFind: string[];
  foundWords: string[];
  grid: string[][];
  foundCells: Set<string>;
  selectedSet: Set<string>;
  onHint: () => void;
  onCellMouseDown: (row: number, col: number) => void;
  onCellMouseOver: (row: number, col: number) => void;
  onSelectionEnd: () => void;
  onTouchMove: (e: TouchEvent) => void;
}) {
  return (
    <div className="screen active-game-screen active">
      <div className="game-info">
        <div className="score-display">
          <div className="score-label">Score</div>
          <span className="score-value">{score}</span>
        </div>
        <div className="timer-display">
          <div className="timer-label">Temps</div>
          <span className={`timer-value ${timer <= 30 ? 'warning' : ''}`}>{timer}</span>
        </div>
        <div className="words-found-display">
          <div className="words-found-label">Mots trouvés</div>
          <span className="words-found-value">{foundWords.length}/{wordsToFind.length}</span>
        </div>
      </div>

      <div className="game-board">
        {/* Word List */}
        <div className="word-list-container">
          <div className="word-list-title">
            <div className="eye-left"></div>
            <div className="eye-right"></div>
          </div>
          <div className="word-items-container" id="word-items-container">
            {[...wordsToFind].sort((a, b) => a.localeCompare(b)).map((word) => (
              <div
                key={word}
                className={`word-item ${foundWords.includes(word) ? 'found' : ''}`}
                data-word={word}
              >
                <span className="word-marker">
                  <i className={`fas ${foundWords.includes(word) ? 'fa-check-circle' : 'fa-circle'}`}></i>
                </span>
                <span className="word-text">{word}</span>
              </div>
            ))}
          </div>
          <div className="help-btn-container">
            <button className="help-btn" onClick={onHint}>
              <div className="back"></div>
              <div className="front"><i className="fa-solid fa-hand-holding-heart"></i></div>
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="word-search-grid-container" id="word-search-grid-container">
          <div
            className="word-search-grid"
            id="word-search-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            }}
            onMouseUp={onSelectionEnd}
            onTouchEnd={(e) => { e.preventDefault(); onSelectionEnd(); }}
            onTouchMove={onTouchMove}
          >
            {grid.map((row, i) =>
              row.map((letter, j) => {
                const key = cellKey(i, j);
                const isFound = foundCells.has(key);
                const isSelected = selectedSet.has(key);
                return (
                  <div
                    key={key}
                    className={`grid-cell ${isFound ? 'found' : ''} ${isSelected ? 'selected' : ''}`}
                    data-row={i}
                    data-col={j}
                    onMouseDown={() => onCellMouseDown(i, j)}
                    onMouseOver={() => onCellMouseOver(i, j)}
                    onTouchStart={(e) => { e.preventDefault(); onCellMouseDown(i, j); }}
                  >
                    {letter}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
