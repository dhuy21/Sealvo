import type { TouchEvent } from 'react';
import { GRID_SIZE, cellKey } from './grid';
import { cx } from '@/lib/css-module';
import styles from '@/styles/games/word-search.module.css';

export function WordSearchBoard({
  score,
  timer,
  wordsToFind,
  foundWords,
  grid,
  foundCells,
  selectedSet,
  hintCells,
  sidebarOpen,
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
  hintCells: Set<string>;
  sidebarOpen: boolean;
  onHint: () => void;
  onCellMouseDown: (row: number, col: number) => void;
  onCellMouseOver: (row: number, col: number) => void;
  onSelectionEnd: () => void;
  onTouchMove: (e: TouchEvent) => void;
}) {
  return (
    <div className={cx(styles, 'screen', 'active-game-screen', 'active')}>
      <div className={cx(styles, 'game-info')}>
        <div className={cx(styles, 'score-display')}>
          <div className={cx(styles, 'score-label')}>Score</div>
          <span className={cx(styles, 'score-value')}>{score}</span>
        </div>
        <div className={cx(styles, 'timer-display')}>
          <div className={cx(styles, 'timer-label')}>Temps</div>
          <span className={cx(styles, 'timer-value', timer <= 30 && 'warning')}>{timer}</span>
        </div>
        <div className={cx(styles, 'words-found-display')}>
          <div className={cx(styles, 'words-found-label')}>Mots trouvés</div>
          <span className={cx(styles, 'words-found-value')}>
            {foundWords.length}/{wordsToFind.length}
          </span>
        </div>
      </div>

      <div className={cx(styles, 'game-board')}>
        {/* Word List */}
        <div className={cx(styles, 'word-list-container', sidebarOpen && 'sidebar-open')}>
          <div className={cx(styles, 'word-list-title')}>
            <div className={cx(styles, 'eye-left')}></div>
            <div className={cx(styles, 'eye-right')}></div>
          </div>
          <div className={cx(styles, 'word-items-container')} id="word-items-container">
            {[...wordsToFind]
              .sort((a, b) => a.localeCompare(b))
              .map((word, i) => (
                <div
                  key={`${word}-${i}`}
                  className={cx(styles, 'word-item', foundWords.includes(word) && 'found')}
                  data-word={word}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <span className={cx(styles, 'word-marker')}>
                    <i
                      className={`fas ${foundWords.includes(word) ? 'fa-check-circle' : 'fa-circle'}`}
                    ></i>
                  </span>
                  <span className={cx(styles, 'word-text')}>{word}</span>
                </div>
              ))}
          </div>
          <div className={cx(styles, 'help-btn-container')}>
            <button className={cx(styles, 'help-btn')} onClick={onHint}>
              <div className={cx(styles, 'back')}></div>
              <div className={cx(styles, 'front')}>
                <i className="fa-solid fa-hand-holding-heart"></i>
              </div>
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className={cx(styles, 'word-search-grid-container')} id="word-search-grid-container">
          <div
            className={cx(styles, 'word-search-grid')}
            id="word-search-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            }}
            onMouseUp={onSelectionEnd}
            onTouchEnd={(e) => {
              e.preventDefault();
              onSelectionEnd();
            }}
            onTouchMove={onTouchMove}
          >
            {grid.map((row, i) =>
              row.map((letter, j) => {
                const key = cellKey(i, j);
                const isFound = foundCells.has(key);
                const isSelected = selectedSet.has(key);
                const isHinted = hintCells.has(key);
                return (
                  <div
                    key={key}
                    className={cx(
                      styles,
                      'grid-cell',
                      isFound && 'found',
                      isSelected && 'selected',
                      isHinted && 'hint-flash',
                    )}
                    data-row={i}
                    data-col={j}
                    onMouseDown={() => onCellMouseDown(i, j)}
                    onMouseOver={() => onCellMouseOver(i, j)}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      onCellMouseDown(i, j);
                    }}
                  >
                    {letter}
                  </div>
                );
              }),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
