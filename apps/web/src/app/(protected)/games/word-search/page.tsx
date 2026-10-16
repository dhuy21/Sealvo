'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGameData, useSaveScore } from '@/hooks/use-games';
import { useTimeouts } from '@/hooks/use-timeouts';
import { launchFireworks } from '@/components/games/confetti';
import { useCelebration } from '@/components/games/use-celebration';
import { useLevelTracking } from '@/components/games/use-level-tracking';
import { GameDataStatus } from '@/components/games/GameDataStatus';
import { GameStats } from '@/components/games/GameStats';
import { GameFooter } from '@/components/games/GameFooter';
import type { LevelStatus } from '@/components/games/TrackLevelMessage';
import {
  cellKey,
  findWordInGrid,
  generateGrid,
  normalizeWord,
  type CellRef,
} from '@/components/games/word-search/grid';
import { showHintToast, showLowScoreToast } from '@/components/games/word-search/hint-toasts';
import { useCellSelection } from '@/components/games/word-search/use-cell-selection';
import { useHintFlash } from '@/components/games/word-search/use-hint-flash';
import { useLetterExplosions } from '@/components/games/word-search/use-letter-explosions';
import { isPortraitBlocked, usePortraitBlocked } from '@/components/games/word-search/use-portrait-blocked';
import { useWordListSidebar } from '@/components/games/word-search/use-word-list-sidebar';
import { RotationNotice } from '@/components/games/word-search/RotationNotice';
import { WordSearchRules } from '@/components/games/word-search/WordSearchRules';
import { WordSearchBoard } from '@/components/games/word-search/WordSearchBoard';
import { WordSearchSummary } from '@/components/games/word-search/WordSearchSummary';
import { cx } from '@/lib/css-module';
import styles from '@/styles/games/word-search.module.css';

/* ================================================================
   INNER COMPONENT
   ================================================================ */
function WordSearchInner() {
  const searchParams = useSearchParams();
  const packageId = searchParams.get('package') ? Number(searchParams.get('package')) : null;

  const { data: gameData, isLoading, error } = useGameData('word_search', packageId);
  const saveScoreMut = useSaveScore();
  const level = useLevelTracking('word_search');

  type Screen = 'pre' | 'active' | 'post';
  const [screen, setScreen] = useState<Screen>('pre');
  const [grid, setGrid] = useState<string[][]>([]);
  const [wordsToFind, setWordsToFind] = useState<string[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [foundCells, setFoundCells] = useState<Set<string>>(new Set());
  const [levelMessage, setLevelMessage] = useState('');
  const [levelStatus, setLevelStatus] = useState<LevelStatus>('');
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const gridRef = useRef<string[][]>([]);
  const gameActiveRef = useRef(false);

  const letters = useLetterExplosions();
  const portraitBlocked = usePortraitBlocked();
  const sidebar = useWordListSidebar();
  const hint = useHintFlash();
  const later = useTimeouts();
  const celebrate = useCelebration(launchFireworks);

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
    if (isPortraitBlocked()) return;
    sidebar.close();
    letters.gameStart();

    if (!gameData || gameData.errorMessage || gameData.words.length === 0) {
      setScreen('pre');
      return;
    }

    const wordStrings = gameData.words.slice(0, 30).map((w) => w.word);
    const newGrid = generateGrid(wordStrings);

    setGrid(newGrid);
    gridRef.current = newGrid;
    setWordsToFind(wordStrings);
    setFoundWords([]);
    setFoundCells(new Set());
    setScore(0);
    setAttempts(0);
    setLevelMessage('');
    setLevelStatus('');
    gameActiveRef.current = true;

    const gameTimer = 300 + wordStrings.length * 13;
    setTimer(gameTimer);
    setScreen('active');
  }

  function checkSelection(cells: CellRef[]) {
    const selectedWord = cells.map((c) => gridRef.current[c.row][c.col]).join('');
    const word = wordsToFind.find((w) => normalizeWord(w) === selectedWord && !foundWords.includes(w));

    if (word !== undefined) {
      setFoundWords([...foundWords, word]);
      letters.wordFound(word);
      setScore((s) => s + selectedWord.length * 5);
      setFoundCells((fc) => {
        const newSet = new Set(fc);
        cells.forEach((c) => newSet.add(cellKey(c.row, c.col)));
        return newSet;
      });
    } else {
      setAttempts((a) => a + 1);
    }
  }

  const selection = useCellSelection(gameActiveRef, checkSelection);

  function showHint() {
    if (!gameActiveRef.current || foundWords.length >= wordsToFind.length) return;
    if (score < 100) {
      showLowScoreToast();
      return;
    }

    const remaining = wordsToFind.filter((w) => !foundWords.includes(w));
    if (remaining.length === 0) return;

    const word = remaining[Math.floor(Math.random() * remaining.length)];
    const cells = findWordInGrid(gridRef.current, normalizeWord(word));
    if (!cells) {
      console.warn('No hint position found for word:', normalizeWord(word));
      return;
    }

    showHintToast(word);
    hint.flash(cells);
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

    level.track(isSuccessful, packageId!);

    if (isSuccessful) {
      setLevelMessage('Excellent travail ! Progressez les autres jeux de ce niveau 😍');
      setLevelStatus('completed');
    } else {
      setLevelMessage('Bon courage ! Réessayer ce jeu pour améliorer vos compétences 🤧');
      setLevelStatus('failed');
    }

    later(() => {
      setScreen('post');
      celebrate();
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
  const selectedSet = new Set(selection.selected.map((c) => cellKey(c.row, c.col)));

  if (!packageId) {
    return (
      <div className={cx(styles, 'game-container')} id="package-id">
        <div className={cx(styles, 'error-box')}>
          <i className="fas fa-exclamation-triangle"></i>
          <p>Aucun package sélectionné.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        id="sidebar-toggle"
        className={cx(styles, 'sidebar-toggle')}
        aria-label="Toggle word list sidebar"
        onClick={sidebar.toggle}
      >
        <i className={`fas ${sidebar.open ? 'fa-times' : 'fa-list'}`}></i>
      </button>
      <RotationNotice visible={portraitBlocked} />
      <div className={cx(styles, 'game-container', 'letter-explosion-mode')} id="package-id" data-package={packageId}>
        {/* Header */}
        <div className={cx(styles, 'game-header')}>
          <h1>Mots Cachés</h1>
          <p className={cx(styles, 'game-description')}>Trouvez les mots cachés dans la grille</p>
        </div>

        {screen === 'pre' && (
          <GameDataStatus isLoading={isLoading} error={error} data={gameData} packageId={packageId} styles={styles} />
        )}

        {gameData && (screen !== 'pre' || ready) && (
          <>
            <GameStats gameType="word_search" wordCount={gameData.wordCount} styles={styles} />

            <div className={cx(styles, 'game-screen')} id="game-screen">
              {screen === 'pre' && <WordSearchRules onStart={startGame} disabled={portraitBlocked} />}

              {screen === 'active' && (
                <WordSearchBoard
                  score={score}
                  timer={timer}
                  wordsToFind={wordsToFind}
                  foundWords={foundWords}
                  grid={grid}
                  foundCells={foundCells}
                  selectedSet={selectedSet}
                  hintCells={hint.flashing}
                  sidebarOpen={sidebar.open}
                  onHint={showHint}
                  onCellMouseDown={selection.start}
                  onCellMouseOver={selection.extend}
                  onSelectionEnd={selection.end}
                  onTouchMove={selection.touchMove}
                />
              )}

              {screen === 'post' && (
                <WordSearchSummary
                  finalScore={score}
                  foundCount={foundWords.length}
                  accuracy={accuracy}
                  levelMessage={levelMessage}
                  levelStatus={levelStatus}
                  levelFinished={level.levelFinished}
                  packageId={packageId}
                  onReplay={startGame}
                />
              )}
            </div>
          </>
        )}

        <GameFooter packageId={packageId} nextGame="test-pronun" styles={styles} />
      </div>
    </>
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
