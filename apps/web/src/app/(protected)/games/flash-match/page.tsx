'use client';

import { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { useTimeouts } from '@/hooks/use-timeouts';
import { launchFireworks } from '@/components/games/confetti';
import { GameDataStatus } from '@/components/games/GameDataStatus';
import { GameStats } from '@/components/games/GameStats';
import { GameFooter } from '@/components/games/GameFooter';
import { useGameShell } from '@/components/games/use-game-shell';
import { FlashMatchRules } from '@/components/games/flash-match/FlashMatchRules';
import { FlashMatchBoard, type Card } from '@/components/games/flash-match/FlashMatchBoard';
import { FlashMatchSummary } from '@/components/games/flash-match/FlashMatchSummary';
import { generateCards } from '@/components/games/flash-match/generate-cards';
import { Bubbles } from '@/components/games/flash-match/Bubbles';
import { isPassed } from '@/components/games/flash-match/scoring';
import { cx } from '@/lib/css-module';
import styles from '@/styles/games/flash-match.module.css';

function FlashMatchContent() {
  const shell = useGameShell('flash_match', { celebration: launchFireworks });
  const { packageId, gameData, screen } = shell;

  const [cards, setCards] = useState<Card[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [totalPairs, setTotalPairs] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const checkingRef = useRef(false);
  const later = useTimeouts();

  useEffect(() => {
    if (gameActive) {
      timerRef.current = setInterval(() => setCurrentTime((t) => t + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [gameActive]);

  const startGame = useCallback(() => {
    if (!gameData?.words?.length || gameData.errorMessage) {
      shell.showRules();
      return;
    }
    const newCards = generateCards(gameData.words);
    setCards(newCards);
    setTotalPairs(newCards.length / 2);
    setSelected([]);
    setMoves(0);
    setMatchedPairs(0);
    setCurrentTime(0);
    setGameActive(true);
    shell.start();
  }, [gameData, shell]);

  const flipCard = useCallback(
    (index: number) => {
      if (!gameActive || checkingRef.current) return;
      if (cards[index].flipped || cards[index].matched) return;
      if (selected.length >= 2) return;

      const newCards = [...cards];
      newCards[index] = { ...newCards[index], flipped: true };
      setCards(newCards);

      const newSelected = [...selected, index];
      setSelected(newSelected);

      if (newSelected.length === 2) {
        setMoves((m) => m + 1);
        checkingRef.current = true;

        later(() => {
          const c1 = newCards[newSelected[0]];
          const c2 = newCards[newSelected[1]];

          if (c1.pairId === c2.pairId && c1.type !== c2.type) {
            const updated = [...newCards];
            updated[newSelected[0]] = { ...updated[newSelected[0]], matched: true };
            updated[newSelected[1]] = { ...updated[newSelected[1]], matched: true };
            setCards(updated);
            const newMatched = matchedPairs + 1;
            setMatchedPairs(newMatched);

            if (newMatched === totalPairs) {
              setGameActive(false);
              clearInterval(timerRef.current);

              shell.finish(newMatched, isPassed(newMatched, totalPairs));
            }
          } else {
            const updated = [...newCards];
            updated[newSelected[0]] = { ...updated[newSelected[0]], flipped: false };
            updated[newSelected[1]] = { ...updated[newSelected[1]], flipped: false };
            setCards(updated);
          }

          setSelected([]);
          checkingRef.current = false;
        }, 1000);
      }
    },
    [gameActive, cards, selected, matchedPairs, totalPairs, shell, later],
  );

  if (!packageId) {
    return (
      <div
        className={cx(styles, 'game-container')}
        style={{ textAlign: 'center', padding: '4rem' }}
      >
        <p>Aucun package sélectionné.</p>
      </div>
    );
  }

  return (
    <div className={cx(styles, 'game-container')}>
      <div className={cx(styles, 'game-header')}>
        <h1>Memory Match</h1>
        <p className={cx(styles, 'game-description')}>Associez chaque mot avec sa définition</p>
      </div>

      {screen === 'pre' && (
        <GameDataStatus
          isLoading={shell.isLoading}
          error={shell.error}
          data={gameData}
          packageId={packageId}
          styles={styles}
        />
      )}

      {gameData && (screen !== 'pre' || shell.ready) && (
        <>
          <GameStats gameType="flash_match" wordCount={gameData.wordCount} styles={styles} />

          <div className={cx(styles, 'game-area')}>
            <div className={cx(styles, 'game-screen')}>
              {screen === 'pre' && <FlashMatchRules onStart={startGame} />}

              {screen === 'active' && (
                <FlashMatchBoard
                  cards={cards}
                  moves={moves}
                  currentTime={currentTime}
                  matchedPairs={matchedPairs}
                  totalPairs={totalPairs}
                  onFlip={flipCard}
                />
              )}

              {screen === 'post' && (
                <FlashMatchSummary
                  matchedPairs={matchedPairs}
                  currentTime={currentTime}
                  moves={moves}
                  levelMessage={shell.levelMessage}
                  levelStatus={shell.levelStatus}
                  levelFinished={shell.levelFinished}
                  packageId={packageId}
                  onReplay={startGame}
                />
              )}
            </div>
          </div>
        </>
      )}

      <GameFooter packageId={packageId} nextGame="speed-vocab" styles={styles} />
      <Bubbles />
    </div>
  );
}

export default function FlashMatchPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <i className="fas fa-spinner fa-spin fa-2x"></i>
        </div>
      }
    >
      <FlashMatchContent />
    </Suspense>
  );
}
