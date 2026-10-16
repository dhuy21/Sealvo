'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGameData, useSaveScore, useTrackLevelProgress } from '@/hooks/use-games';
import { launchFireworks } from '@/components/games/confetti';
import { levelCompletedMessage } from '@/components/games/level-progress';
import { GameDataStatus } from '@/components/games/GameDataStatus';
import { GameStats } from '@/components/games/GameStats';
import { GameFooter } from '@/components/games/GameFooter';
import type { LevelStatus } from '@/components/games/TrackLevelMessage';
import { DIRECTIONS, cellKey, generateGrid, type CellRef } from '@/components/games/word-search/grid';
import { WordSearchRules } from '@/components/games/word-search/WordSearchRules';
import { WordSearchBoard } from '@/components/games/word-search/WordSearchBoard';
import { WordSearchSummary } from '@/components/games/word-search/WordSearchSummary';

/* ================================================================
   INNER COMPONENT
   ================================================================ */
function WordSearchInner() {
  const searchParams = useSearchParams();
  const packageId = searchParams.get('package') ? Number(searchParams.get('package')) : null;

  const { data: gameData, isLoading, error } = useGameData('word_search', packageId);
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
  const [levelStatus, setLevelStatus] = useState<LevelStatus>('');
  const [startNotice, setStartNotice] = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const isSelectingRef = useRef(false);
  const gridRef = useRef<string[][]>([]);
  const gameActiveRef = useRef(false);

  const ready = !!gameData && !gameData.errorMessage;

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

  useEffect(() => {
    if (screen === 'active' && foundWords.length > 0 && foundWords.length >= wordsToFind.length) {
      endGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foundWords.length]);

  function startGame() {
    if (!gameData || gameData.errorMessage || gameData.words.length === 0) {
      setScreen('pre');
      return;
    }

    const wordStrings = gameData.words.slice(0, 30).map((w) => w.word);
    const { grid: newGrid, placedWords } = generateGrid(wordStrings);
    if (placedWords.length === 0) {
      setStartNotice(
        'Aucun mot ne peut être placé dans la grille : seuls les mots de 2 à 15 lettres latines (A–Z) sont utilisables.',
      );
      setScreen('pre');
      return;
    }
    setStartNotice('');

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
        onSuccess: (data) => {
          const message = levelCompletedMessage(data);
          if (message) {
            setLevelMessage(message);
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
      launchFireworks();
    }, 1000);
  }

  // End when timer=0 or all found
  useEffect(() => {
    if (screen === 'active' && timer === 0 && wordsToFind.length > 0) {
      endGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer, screen]);

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

      {screen === 'pre' && (
        <GameDataStatus isLoading={isLoading} error={error} data={gameData} packageId={packageId} />
      )}

      {gameData && (screen !== 'pre' || ready) && (
        <>
          <GameStats wordCount={gameData.wordCount} />

          <div className="game-screen" id="game-screen">
            {screen === 'pre' && <WordSearchRules onStart={startGame} notice={startNotice} />}

            {screen === 'active' && (
              <WordSearchBoard
                score={score}
                timer={timer}
                wordsToFind={wordsToFind}
                foundWords={foundWords}
                grid={grid}
                foundCells={foundCells}
                selectedSet={selectedSet}
                onHint={showHint}
                onCellMouseDown={handleCellMouseDown}
                onCellMouseOver={handleCellMouseOver}
                onSelectionEnd={handleSelectionEnd}
                onTouchMove={handleTouchMove}
              />
            )}

            {screen === 'post' && (
              <WordSearchSummary
                finalScore={score + (foundWords.length === wordsToFind.length ? 100 : 0)}
                foundCount={foundWords.length}
                accuracy={accuracy}
                levelMessage={levelMessage}
                levelStatus={levelStatus}
                onReplay={startGame}
              />
            )}
          </div>
        </>
      )}

      <GameFooter packageId={packageId} />
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
