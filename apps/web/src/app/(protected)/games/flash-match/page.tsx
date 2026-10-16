'use client';

import { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGameData, useSaveScore } from '@/hooks/use-games';
import type { GameWord } from '@/hooks/use-games';
import { useTimeouts } from '@/hooks/use-timeouts';
import { shuffleArray } from '@/lib/shuffle';
import { formatTypeMeaning } from '@/lib/word-type';
import { GameDataStatus } from '@/components/games/GameDataStatus';
import { GameStats } from '@/components/games/GameStats';
import { GameFooter } from '@/components/games/GameFooter';
import { useLevelTracking } from '@/components/games/use-level-tracking';
import { FlashMatchRules } from '@/components/games/flash-match/FlashMatchRules';
import { FlashMatchBoard, type Card } from '@/components/games/flash-match/FlashMatchBoard';
import { FlashMatchSummary } from '@/components/games/flash-match/FlashMatchSummary';
import { Bubbles } from '@/components/games/flash-match/Bubbles';
import { cx } from '@/lib/css-module';
import styles from '@/styles/games/flash-match.module.css';

function generateCards(words: GameWord[]): Card[] {
  const selected = shuffleArray(words).slice(0, 15); // max 15 pairs
  const cards: Card[] = [];
  selected.forEach((w) => {
    cards.push({ pairId: w.detail_id, type: 'word', content: w.word, flipped: false, matched: false });
    cards.push({
      pairId: w.detail_id,
      type: 'meaning',
      content: formatTypeMeaning(w.type, w.meaning),
      flipped: false,
      matched: false,
    });
  });
  return shuffleArray(cards);
}

type Screen = 'pre' | 'active' | 'post';

/* ═══════════════════════════ */
/* FLASH MATCH GAME            */
/* ═══════════════════════════ */
function FlashMatchContent() {
  const searchParams = useSearchParams();
  const packageId = Number(searchParams.get('package'));

  const { data: gameData, isLoading, error } = useGameData('flash_match', packageId || null);
  const saveScore = useSaveScore();
  const level = useLevelTracking('flash_match');

  const [screen, setScreen] = useState<Screen>('pre');
  const [cards, setCards] = useState<Card[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [totalPairs, setTotalPairs] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [levelMessage, setLevelMessage] = useState<{ text: string; success: boolean } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const checkingRef = useRef(false);
  const later = useTimeouts();

  const ready = !!gameData && !gameData.errorMessage;

  // Timer
  useEffect(() => {
    if (gameActive) {
      timerRef.current = setInterval(() => setCurrentTime((t) => t + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [gameActive]);

  const startGame = useCallback(() => {
    if (!gameData?.words?.length || gameData.errorMessage) {
      setScreen('pre');
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
    setScreen('active');
    setLevelMessage(null);
  }, [gameData]);

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
            // Match
            const updated = [...newCards];
            updated[newSelected[0]] = { ...updated[newSelected[0]], matched: true };
            updated[newSelected[1]] = { ...updated[newSelected[1]], matched: true };
            setCards(updated);
            const newMatched = matchedPairs + 1;
            setMatchedPairs(newMatched);

            if (newMatched === totalPairs) {
              // Game over
              setGameActive(false);
              clearInterval(timerRef.current);

              const isSuccessful = newMatched >= Math.ceil(totalPairs * 0.8);
              setLevelMessage({
                text: isSuccessful
                  ? 'Excellent travail ! Progressez les autres jeux de ce niveau 😍'
                  : 'Bon courage ! Réessayer ce jeu pour améliorer vos compétences 🤧',
                success: isSuccessful,
              });

              saveScore.mutate({ game_type: 'flash_match', score: newMatched });
              level.track(isSuccessful, packageId);

              later(() => setScreen('post'), 1000);
            }
          } else {
            // No match
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
    [gameActive, cards, selected, matchedPairs, totalPairs, packageId, saveScore, level, later],
  );

  if (!packageId) {
    return (
      <div className={cx(styles, 'game-container')} style={{ textAlign: 'center', padding: '4rem' }}>
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
        <GameDataStatus isLoading={isLoading} error={error} data={gameData} packageId={packageId} styles={styles} />
      )}

      {gameData && (screen !== 'pre' || ready) && (
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
                  levelMessage={levelMessage?.text ?? ''}
                  levelStatus={levelMessage ? (levelMessage.success ? 'completed' : 'failed') : ''}
                  levelFinished={level.levelFinished}
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
