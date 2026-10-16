'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGameData, useSaveScore } from '@/hooks/use-games';
import { useTimeouts } from '@/hooks/use-timeouts';
import { shuffleArray } from '@/lib/shuffle';
import { formatTypeMeaning } from '@/lib/word-type';
import { launchSideCannons } from '@/components/games/confetti';
import { useCelebration } from '@/components/games/use-celebration';
import { useLevelTracking } from '@/components/games/use-level-tracking';
import { GameDataStatus } from '@/components/games/GameDataStatus';
import { GameStats } from '@/components/games/GameStats';
import { GameFooter } from '@/components/games/GameFooter';
import type { LevelStatus } from '@/components/games/TrackLevelMessage';
import { MagicalBackground } from '@/components/games/word-scramble/MagicalBackground';
import { WordScrambleRules } from '@/components/games/word-scramble/WordScrambleRules';
import { ScrambleBoard, type ScrambledWord } from '@/components/games/word-scramble/ScrambleBoard';
import { WordScrambleSummary } from '@/components/games/word-scramble/WordScrambleSummary';
import { cx } from '@/lib/css-module';
import styles from '@/styles/games/word-scramble.module.css';

/* ================================================================
   HELPERS
   ================================================================ */
function scrambleWord(word: string): string {
  const letters = word.split('');
  let scrambled: string;
  do {
    scrambled = shuffleArray(letters).join('');
  } while (scrambled === word && word.length > 1);
  return scrambled;
}

/* ================================================================
   INNER COMPONENT
   ================================================================ */
function WordScrambleInner() {
  const searchParams = useSearchParams();
  const packageId = searchParams.get('package') ? Number(searchParams.get('package')) : null;

  const { data: gameData, isLoading, error } = useGameData('word_scramble', packageId);
  const saveScore = useSaveScore();
  const level = useLevelTracking('word_scramble');

  type Screen = 'pre' | 'active' | 'post';
  const [screen, setScreen] = useState<Screen>('pre');
  const [words, setWords] = useState<ScrambledWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [timer, setTimer] = useState(0);
  const [input, setInput] = useState('');
  const [resultMessage, setResultMessage] = useState('');
  const [resultType, setResultType] = useState<'correct' | 'incorrect' | ''>('');
  const [canSkip, setCanSkip] = useState(false);
  const [levelMessage, setLevelMessage] = useState('');
  const [levelStatus, setLevelStatus] = useState<LevelStatus>('');

  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const later = useTimeouts();
  const celebrate = useCelebration(launchSideCannons);

  const currentWord = words[currentIndex] ?? null;
  const ready = !!gameData && !gameData.errorMessage;

  // Timer countdown
  useEffect(() => {
    if (screen === 'active' && timer > 0) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [screen, timer > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  function startGame() {
    if (!gameData || gameData.errorMessage || gameData.words.length === 0) {
      setScreen('pre');
      return;
    }

    const shuffled = shuffleArray(
      gameData.words.map((w) => ({
        word: w.word,
        scrambled: scrambleWord(w.word),
        meaning: formatTypeMeaning(w.type, w.meaning),
      })),
    );
    setWords(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setCorrectAnswers(0);
    setTotalAttempts(0);
    setInput('');
    setResultMessage('');
    setResultType('');
    setCanSkip(false);
    setLevelMessage('');
    setLevelStatus('');

    const gameTimer = 110 + shuffled.length * 9;
    setTimer(gameTimer);
    setScreen('active');

    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function checkAnswer() {
    // One answer per word: once revealed, only "next" is allowed.
    if (!currentWord || resultType || !input.trim()) return;

    setTotalAttempts((prev) => prev + 1);
    if (input.trim().toLowerCase() === currentWord.word.toLowerCase()) {
      setScore((prev) => prev + 10);
      setCorrectAnswers((prev) => prev + 1);
      setResultMessage('Correct !');
      setResultType('correct');
    } else {
      setResultMessage('Incorrect !');
      setResultType('incorrect');
    }
    setCanSkip(true);
  }

  const goToNextWord = useCallback(() => {
    setCanSkip(false);
    setInput('');
    setResultMessage('');
    setResultType('');

    let nextIndex = Math.floor(Math.random() * words.length);
    while (nextIndex === currentIndex && words.length > 1) {
      nextIndex = Math.floor(Math.random() * words.length);
    }
    setCurrentIndex(nextIndex);
  }, [words.length, currentIndex]);

  function endGame() {
    clearInterval(timerRef.current);
    const accuracy = totalAttempts > 0 ? Math.round((correctAnswers / totalAttempts) * 100) : 0;
    const isSuccessful = accuracy >= 80;

    saveScore.mutate({ game_type: 'word_scramble', score });

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

  // End game when timer hits 0
  useEffect(() => {
    if (screen === 'active' && timer === 0 && words.length > 0) {
      // Reacting to the countdown interval reaching 0; the tick itself cannot see the final state
      // eslint-disable-next-line react-hooks/set-state-in-effect
      endGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer, screen]);

  const finalAccuracy = totalAttempts > 0 ? Math.round((correctAnswers / totalAttempts) * 100) : 0;

  if (!packageId) {
    return (
      <div className={cx(styles, 'game-container')}>
        <div className={cx(styles, 'error-box')}>
          <i className="fas fa-exclamation-triangle"></i>
          <p>Aucun package sélectionné.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cx(styles, 'game-container')}>
      <MagicalBackground />

      {/* Header */}
      <div className={cx(styles, 'game-header')}>
        <h1>Mots Mélangés</h1>
        <p className={cx(styles, 'game-description')}>Retrouvez les mots mélangés</p>
      </div>

      {screen === 'pre' && (
        <GameDataStatus isLoading={isLoading} error={error} data={gameData} packageId={packageId} styles={styles} />
      )}

      {gameData && (screen !== 'pre' || ready) && (
        <>
          <GameStats gameType="word_scramble" wordCount={gameData.wordCount} styles={styles} />

          <div className={cx(styles, 'game-area')}>
            <div className={cx(styles, 'game-screen')}>
              {screen === 'pre' && <WordScrambleRules onStart={startGame} />}

              {screen === 'active' && currentWord && (
                <ScrambleBoard
                  currentWord={currentWord}
                  score={score}
                  timer={timer}
                  input={input}
                  inputRef={inputRef}
                  resultMessage={resultMessage}
                  resultType={resultType}
                  canSkip={canSkip}
                  onInputChange={setInput}
                  onCheck={checkAnswer}
                  onNext={goToNextWord}
                />
              )}

              {screen === 'post' && (
                <WordScrambleSummary
                  score={score}
                  correctAnswers={correctAnswers}
                  accuracy={finalAccuracy}
                  levelMessage={levelMessage}
                  levelStatus={levelStatus}
                  levelFinished={level.levelFinished}
                  packageId={packageId}
                  onReplay={startGame}
                />
              )}
            </div>
          </div>
        </>
      )}

      <GameFooter packageId={packageId} nextGame="flash-match" styles={styles} />
    </div>
  );
}

/* ================================================================
   PAGE
   ================================================================ */
export default function WordScramblePage() {
  return (
    <Suspense>
      <WordScrambleInner />
    </Suspense>
  );
}
