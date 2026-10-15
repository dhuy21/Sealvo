'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useGameData, useSaveScore, useTrackLevelProgress, type GameWord } from '@/hooks/use-games';
import confetti from 'canvas-confetti';

/* ================================================================
   CONSTANTS & TYPES
   ================================================================ */
const GRID_SIZE = 15;
const DIRECTIONS: [number, number][] = [
  [0, 1], [1, 0], [1, 1], [1, -1],
  [0, -1], [-1, 0], [-1, 1], [-1, -1],
];

interface CellRef {
  row: number;
  col: number;
}

/* ================================================================
   GRID GENERATION
   ================================================================ */
function generateGrid(wordList: string[]): { grid: string[][]; placedWords: string[] } {
  const grid: string[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(''));
  const placedWords: string[] = [];

  function canPlace(word: string, row: number, col: number, dx: number, dy: number): boolean {
    const len = word.length;
    if (row + dx * (len - 1) < 0 || row + dx * (len - 1) >= GRID_SIZE) return false;
    if (col + dy * (len - 1) < 0 || col + dy * (len - 1) >= GRID_SIZE) return false;
    for (let i = 0; i < len; i++) {
      const c = grid[row + dx * i][col + dy * i];
      if (c !== '' && c !== word[i]) return false;
    }
    return true;
  }

  for (const rawWord of wordList) {
    const word = rawWord.toUpperCase().replace(/[^A-Z]/g, '');
    if (word.length <= 1 || word.length > GRID_SIZE) continue;

    let placed = false;
    for (let attempt = 0; attempt < 100 && !placed; attempt++) {
      const dirIdx = Math.floor(Math.random() * DIRECTIONS.length);
      const [dx, dy] = DIRECTIONS[dirIdx];
      const row = Math.floor(Math.random() * GRID_SIZE);
      const col = Math.floor(Math.random() * GRID_SIZE);

      if (canPlace(word, row, col, dx, dy)) {
        for (let i = 0; i < word.length; i++) {
          grid[row + dx * i][col + dy * i] = word[i];
        }
        placedWords.push(rawWord);
        placed = true;
      }
    }
  }

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (grid[i][j] === '') {
        grid[i][j] = letters.charAt(Math.floor(Math.random() * letters.length));
      }
    }
  }

  return { grid, placedWords };
}

function launchConfetti() {
  const duration = 15 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) return clearInterval(interval);
    const particleCount = 50 * (timeLeft / duration);
    confetti({ ...defaults, particleCount, origin: { x: Math.random() * 0.2 + 0.1, y: Math.random() - 0.2 } });
    confetti({ ...defaults, particleCount, origin: { x: Math.random() * 0.2 + 0.7, y: Math.random() - 0.2 } });
  }, 250);
}

/* ================================================================
   INNER COMPONENT
   ================================================================ */
function WordSearchInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const packageId = searchParams.get('package') ? Number(searchParams.get('package')) : null;

  const { data: gameData } = useGameData('word_search', packageId);
  const saveScoreMut = useSaveScore();
  const trackLevel = useTrackLevelProgress();

  type Screen = 'pre' | 'active' | 'post';
  const [screen, setScreen] = useState<Screen>('pre');
  const [grid, setGrid] = useState<string[][]>([]);
  const [wordsToFind, setWordsToFind] = useState<string[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [selectedCells, setSelectedCells] = useState<CellRef[]>([]);
  const [foundCells, setFoundCells] = useState<Set<string>>(new Set());
  const [levelMessage, setLevelMessage] = useState('');
  const [levelStatus, setLevelStatus] = useState<'completed' | 'failed' | ''>('');

  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const isSelectingRef = useRef(false);
  const gridRef = useRef<string[][]>([]);
  const gameActiveRef = useRef(false);

  // Timer
  useEffect(() => {
    if (screen === 'active' && timer > 0) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) { clearInterval(timerRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [screen, timer > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // End when timer=0 or all found
  useEffect(() => {
    if (screen === 'active' && timer === 0 && wordsToFind.length > 0) {
      endGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer, screen]);

  useEffect(() => {
    if (screen === 'active' && foundWords.length > 0 && foundWords.length >= wordsToFind.length) {
      endGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foundWords.length]);

  function startGame() {
    if (!gameData || gameData.words.length === 0) return;

    const wordStrings = gameData.words.slice(0, 30).map((w) => w.word);
    const { grid: newGrid, placedWords } = generateGrid(wordStrings);

    setGrid(newGrid);
    gridRef.current = newGrid;
    setWordsToFind(placedWords);
    setFoundWords([]);
    setFoundCells(new Set());
    setScore(0);
    setAttempts(0);
    setSelectedCells([]);
    setLevelMessage('');
    setLevelStatus('');
    gameActiveRef.current = true;

    const gameTimer = 300 + placedWords.length * 13;
    setTimer(gameTimer);
    setScreen('active');
  }

  const cellKey = (r: number, c: number) => `${r},${c}`;

  const handleCellMouseDown = useCallback((row: number, col: number) => {
    if (!gameActiveRef.current) return;
    isSelectingRef.current = true;
    setSelectedCells([{ row, col }]);
  }, []);

  const handleCellMouseOver = useCallback((row: number, col: number) => {
    if (!isSelectingRef.current || !gameActiveRef.current) return;

    setSelectedCells((prev) => {
      if (prev.length === 0) return prev;

      // Already selected?
      const existingIdx = prev.findIndex((c) => c.row === row && c.col === col);
      if (existingIdx !== -1 && existingIdx < prev.length - 1) {
        return prev.slice(0, existingIdx + 1);
      }
      if (existingIdx !== -1) return prev;

      const last = prev[prev.length - 1];
      const rowDiff = row - last.row;
      const colDiff = col - last.col;

      const isValid = DIRECTIONS.some(([dx, dy]) =>
        dx === Math.sign(rowDiff) && dy === Math.sign(colDiff) &&
        (Math.abs(rowDiff) === Math.abs(colDiff) || rowDiff === 0 || colDiff === 0)
      );
      if (!isValid) return prev;

      // Check consistent direction
      if (prev.length > 1) {
        const first = prev[0];
        const dirX = Math.sign(last.row - first.row);
        const dirY = Math.sign(last.col - first.col);
        const newDirX = Math.sign(row - first.row);
        const newDirY = Math.sign(col - first.col);

        if (dirX !== 0 && newDirX !== dirX) return prev;
        if (dirY !== 0 && newDirY !== dirY) return prev;

        const isInLine = (dirX === 0 && newDirX === 0) || (dirY === 0 && newDirY === 0) ||
          Math.abs(row - first.row) === Math.abs(col - first.col);
        if (!isInLine) return prev;
      }

      return [...prev, { row, col }];
    });
  }, []);

  const handleSelectionEnd = useCallback(() => {
    if (!gameActiveRef.current) return;
    isSelectingRef.current = false;

    setSelectedCells((prev) => {
      if (prev.length === 0) return prev;

      const selectedWord = prev.map((c) => gridRef.current[c.row][c.col]).join('');

      const foundIdx = wordsToFind.findIndex((w) =>
        w.toUpperCase().replace(/[^A-Z]/g, '') === selectedWord && !foundWords.includes(w)
      );

      if (foundIdx !== -1) {
        const word = wordsToFind[foundIdx];
        setFoundWords((f) => [...f, word]);
        setScore((s) => s + selectedWord.length * 5);
        setFoundCells((fc) => {
          const newSet = new Set(fc);
          prev.forEach((c) => newSet.add(cellKey(c.row, c.col)));
          return newSet;
        });
      } else {
        setAttempts((a) => a + 1);
      }

      return [];
    });
  }, [wordsToFind, foundWords]);

  // Touch handling
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSelectingRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el && el instanceof HTMLElement && el.dataset.row && el.dataset.col) {
      handleCellMouseOver(parseInt(el.dataset.row), parseInt(el.dataset.col));
    }
  }, [handleCellMouseOver]);

  function showHint() {
    if (score < 100) return;

    const remaining = wordsToFind.filter((w) => !foundWords.includes(w));
    if (remaining.length === 0) return;

    const word = remaining[Math.floor(Math.random() * remaining.length)];
    alert(`Indice: Cherchez le mot "${word}" (-100 points)`);
    setScore((s) => Math.max(0, s - 100));
  }

  function endGame() {
    clearInterval(timerRef.current);
    gameActiveRef.current = false;

    const bonusScore = foundWords.length === wordsToFind.length ? 100 : 0;
    const totalScore = score + bonusScore;

    const minWordsFound = Math.ceil(wordsToFind.length * 0.7);
    const isSuccessful = foundWords.length >= minWordsFound;

    saveScoreMut.mutate({ game_type: 'word_search', score: totalScore });

    trackLevel.mutate(
      { game_type: 'word_search', completed: isSuccessful, packageId: packageId! },
      {
        onSuccess: (data: { level_completed?: boolean; words_updated?: number; to_level?: string }) => {
          if (data.level_completed && data.words_updated && data.words_updated > 0) {
            setLevelMessage(`Niveau terminé! ${data.words_updated} mots sont passés au niveau ${data.to_level}`);
            setLevelStatus('completed');
          }
        },
      },
    );

    if (isSuccessful) {
      setLevelMessage('Excellent travail ! Progressez les autres jeux de ce niveau 😍');
      setLevelStatus('completed');
    } else {
      setLevelMessage('Bon courage ! Réessayer ce jeu pour améliorer vos compétences 🤧');
      setLevelStatus('failed');
    }

    setTimeout(() => {
      setScreen('post');
      launchConfetti();
    }, 1000);
  }

  const accuracy = attempts > 0 ? Math.round((foundWords.length / attempts) * 100) : 0;
  const selectedSet = new Set(selectedCells.map((c) => cellKey(c.row, c.col)));

  if (!packageId) {
    return (
      <div className="game-container" id="package-id">
        <div className="error-box">
          <i className="fas fa-exclamation-triangle"></i>
          <p>Aucun package sélectionné.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="game-container letter-explosion-mode" id="package-id" data-package={packageId}>
      {/* Header */}
      <div className="game-header">
        <h1>Word Search</h1>
        <p className="game-description">Trouvez les mots cachés dans la grille</p>
      </div>

      {/* Error */}
      {gameData?.errorMessage && (
        <div className="error-box">
          <i className="fas fa-exclamation-triangle"></i>
          <p>{gameData.errorMessage}</p>
        </div>
      )}

      {/* Stats */}
      {gameData && !gameData.errorMessage && (
        <div className="game-stats">
          <div className="stat-box">
            <span className="stat-label">Mots disponibles</span>
            <span className="stat-value">{gameData.wordCount}</span>
          </div>
        </div>
      )}

      {gameData && !gameData.errorMessage && (
        <div className="game-screen" id="game-screen">
          {/* PRE-GAME */}
          {screen === 'pre' && (
            <div className="screen pre-game-screen active">
              <h2><i className="fas fa-bolt" style={{ color: '#e9e919' }}></i> Règles du jeu</h2>
              <ul className="rules-list">
                <li>Cliquez et faites glisser pour sélectionner les lettres qui forment un mot.</li>
                <li>Lorsque vous trouvez un mot, il sera marqué dans la liste.</li>
                <li>Pour un mot correct, vous gagnez 5 points par lettre.</li>
                <li>Avec un score inférieur à 100 points, pas d&apos;indice.</li>
              </ul>
              <button className="start-btn" onClick={startGame}>
                <i className="fas fa-play"></i> Commencer
              </button>
            </div>
          )}

          {/* ACTIVE GAME */}
          {screen === 'active' && (
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
                    <button className="help-btn" onClick={showHint}>
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
                    onMouseUp={handleSelectionEnd}
                    onTouchEnd={(e) => { e.preventDefault(); handleSelectionEnd(); }}
                    onTouchMove={handleTouchMove}
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
                            onMouseDown={() => handleCellMouseDown(i, j)}
                            onMouseOver={() => handleCellMouseOver(i, j)}
                            onTouchStart={(e) => { e.preventDefault(); handleCellMouseDown(i, j); }}
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
          )}

          {/* POST-GAME */}
          {screen === 'post' && (
            <div className="screen post-game-screen active">
              <div className="final-score-container">
                <div className="final-score-label">Score final</div>
                <span className="final-score">{score + (foundWords.length === wordsToFind.length ? 100 : 0)}</span>
              </div>

              <div className="game-summary">
                <div className="summary-item">
                  <div className="summary-icon">⏰ Mots trouvés</div>
                  <span className="summary-value">{foundWords.length}</span>
                </div>
                <div className="summary-item">
                  <div className="summary-icon">👾 Précision</div>
                  <span className="summary-value">{accuracy}%</span>
                </div>
              </div>

              {levelMessage && (
                <div className={`track-level-message ${levelStatus ? `level-${levelStatus}` : ''}`}>
                  {levelMessage}
                </div>
              )}

              <div className="action-buttons">
                <button className="play-again-btn" onClick={startGame}>
                  <i className="fas fa-redo"></i> Rejouer
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="game-footer">
        <button className="btn learn-btn" onClick={() => router.push(`/learn?package=${packageId}`)}>
          <i className="fas fa-arrow-left"></i> Apprendre
        </button>
      </div>
    </div>
  );
}

/* ================================================================
   PAGE
   ================================================================ */
export default function WordSearchPage() {
  return (
    <Suspense>
      <WordSearchInner />
    </Suspense>
  );
}
