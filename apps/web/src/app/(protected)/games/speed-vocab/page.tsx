'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGameData, useSaveScore } from '@/hooks/use-games';
import { useTimeouts } from '@/hooks/use-timeouts';
import { shuffleArray } from '@/lib/shuffle';
import { launchEmbers } from '@/components/games/confetti';
import { useCelebration } from '@/components/games/use-celebration';
import { useLevelTracking } from '@/components/games/use-level-tracking';
import { GameDataStatus } from '@/components/games/GameDataStatus';
import { GameStats } from '@/components/games/GameStats';
import { GameFooter } from '@/components/games/GameFooter';
import type { LevelStatus } from '@/components/games/TrackLevelMessage';
import { SpeedVocabRules } from '@/components/games/speed-vocab/SpeedVocabRules';
import { SpeedVocabBoard } from '@/components/games/speed-vocab/SpeedVocabBoard';
import { SpeedVocabSummary } from '@/components/games/speed-vocab/SpeedVocabSummary';
import { playErrorSound, playSuccessSound } from '@/components/games/speed-vocab/speed-sounds';
import { useSpeedBackground } from '@/components/games/speed-vocab/use-speed-background';
import { useTransientFlag } from '@/components/games/use-transient-flag';
import { cx } from '@/lib/css-module';
import styles from '@/styles/games/speed-vocab.module.css';

/* ================================================================
   INNER COMPONENT
   ================================================================ */
function SpeedVocabInner() {
  const searchParams = useSearchParams();
  const packageId = searchParams.get('package') ? Number(searchParams.get('package')) : null;

  const { data: gameData, isLoading, error } = useGameData('speed_vocab', packageId);
  const saveScore = useSaveScore();
  const level = useLevelTracking('speed_vocab');

  type Screen = 'pre' | 'active' | 'post';
  const [screen, setScreen] = useState<Screen>('pre');
  const [words, setWords] = useState<{ word: string; meaning: string }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [wordsTyped, setWordsTyped] = useState(0);
  const [correctWords, setCorrectWords] = useState(0);
  const [input, setInput] = useState('');
  const [inputFeedback, setInputFeedback] = useState<'correct' | 'incorrect' | ''>('');
  const [energetic, triggerEnergetic] = useTransientFlag();
  const [wordFadeIn, triggerWordFadeIn] = useTransientFlag();
  const [streakCelebration, triggerStreakCelebration] = useTransientFlag();
  const [shaking, triggerShake] = useTransientFlag();
  const [levelMessage, setLevelMessage] = useState('');
  const [levelStatus, setLevelStatus] = useState<LevelStatus>('');

  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wrongPendingRef = useRef(false);
  const later = useTimeouts();
  const celebrate = useCelebration(launchEmbers);

  const currentWord = words[currentIndex] ?? null;
  const ready = !!gameData && !gameData.errorMessage;

  // Timer countdown
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

  const gameActive = screen === 'active' && timer > 0;
  const speedLinesRef = useSpeedBackground(gameActive, timer);

  // Urgency shake on every even second of the last ten
  useEffect(() => {
    if (gameActive && timer <= 10 && timer % 2 === 0) triggerShake(500);
  }, [gameActive, timer, triggerShake]);

  // Keep the focus on the input while playing
  useEffect(() => {
    if (!gameActive) return;
    const refocus = () => inputRef.current?.focus();
    document.addEventListener('click', refocus);
    return () => document.removeEventListener('click', refocus);
  }, [gameActive]);

  function showWord(index: number) {
    setCurrentIndex(index);
    triggerEnergetic(500);
    triggerWordFadeIn(500);
  }

  function startGame() {
    if (!gameData || gameData.errorMessage || gameData.words.length === 0) {
      setScreen('pre');
      return;
    }

    const prepared = gameData.words.map((w) => ({ word: w.word, meaning: w.meaning }));
    const shuffled = shuffleArray(prepared);
    setWords(shuffled);
    showWord(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setWordsTyped(0);
    setCorrectWords(0);
    setInput('');
    clearTimeout(feedbackTimeoutRef.current);
    wrongPendingRef.current = false;
    setInputFeedback('');
    setLevelMessage('');
    setLevelStatus('');

    const gameTimer = 100 + shuffled.length * 6;
    setTimer(gameTimer);
    setScreen('active');

    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function nextIndex() {
    let index = Math.floor(Math.random() * words.length);
    while (index === currentIndex && words.length > 1) {
      index = Math.floor(Math.random() * words.length);
    }
    return index;
  }

  function flashInput(feedback: 'correct' | 'incorrect', onDone?: () => void) {
    clearTimeout(feedbackTimeoutRef.current);
    setInputFeedback(feedback);
    feedbackTimeoutRef.current = setTimeout(() => {
      setInputFeedback('');
      onDone?.();
    }, 500);
  }

  function handleInput(value: string) {
    if (!currentWord || !gameActive || wrongPendingRef.current) return;
    setInput(value);

    const userInput = value.trim().toLowerCase();
    const correctWord = currentWord.word.trim().toLowerCase();

    if (userInput === correctWord) {
      setWordsTyped((p) => p + 1);
      setCorrectWords((p) => p + 1);
      playSuccessSound();

      const newStreak = streak + 1;
      setStreak(newStreak);
      setBestStreak((p) => Math.max(p, newStreak));

      let wordPoints = 10;
      wordPoints += Math.max(0, correctWord.length - 4); // length bonus
      wordPoints += Math.floor(newStreak / 3) * 5; // streak bonus
      setScore((p) => p + wordPoints);

      if (newStreak % 3 === 0) triggerStreakCelebration(800);
      flashInput('correct');
      setInput('');
      showWord(nextIndex());
    } else if (userInput.length >= correctWord.length) {
      setWordsTyped((p) => p + 1);
      setStreak(0);
      playErrorSound();
      triggerShake(500);

      wrongPendingRef.current = true;
      const next = nextIndex();
      flashInput('incorrect', () => {
        wrongPendingRef.current = false;
        setInput('');
        showWord(next);
      });
    }
  }

  function endGame() {
    clearInterval(timerRef.current);
    const accuracy = wordsTyped > 0 ? Math.round((correctWords / wordsTyped) * 100) : 0;
    const isSuccessful = accuracy >= 70;

    saveScore.mutate({ game_type: 'speed_vocab', score });

    if (isSuccessful) {
      setLevelMessage('Excellent travail ! Progressez les autres jeux de ce niveau 😍');
      setLevelStatus('completed');
    } else {
      setLevelMessage('Bon courage ! Réessayer ce jeu pour améliorer vos compétences 🤧');
      setLevelStatus('failed');
    }

    later(() => {
      setScreen('post');
      level.track(isSuccessful, packageId!);
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

  const wpm = Math.round((correctWords / 60) * 60);

  if (!packageId) {
    return (
      <div className={cx(styles, 'game-container')} id="speed-vocab">
        <div className={cx(styles, 'error-box')}>
          <i className="fas fa-exclamation-triangle"></i>
          <p>Aucun package sélectionné.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cx(styles, 'game-container', shaking && 'screen-shake')}
      id="speed-vocab"
      data-package={packageId}
    >
      {/* Header */}
      <div className={cx(styles, 'game-header')}>
        <h1>Vitesse Vocab</h1>
        <p className={cx(styles, 'game-description')}>Tapez les mots le plus vite possible</p>
      </div>

      {screen === 'pre' && (
        <GameDataStatus isLoading={isLoading} error={error} data={gameData} packageId={packageId} styles={styles} />
      )}

      {gameData && (screen !== 'pre' || ready) && (
        <>
          <GameStats gameType="speed_vocab" wordCount={gameData.wordCount} styles={styles} />

          {screen === 'pre' && <SpeedVocabRules onStart={startGame} />}

          {screen === 'active' && currentWord && (
            <SpeedVocabBoard
              currentWord={currentWord}
              score={score}
              streak={streak}
              timer={timer}
              input={input}
              inputRef={inputRef}
              speedLinesRef={speedLinesRef}
              flags={{ energetic, wordFadeIn, streakCelebration, inputFeedback }}
              onInput={handleInput}
            />
          )}

          {screen === 'post' && (
            <SpeedVocabSummary
              score={score}
              bestStreak={bestStreak}
              wpm={wpm}
              levelMessage={levelMessage}
              levelStatus={levelStatus}
              levelFinished={level.levelFinished}
              packageId={packageId}
              onReplay={startGame}
            />
          )}
        </>
      )}

      <GameFooter packageId={packageId} nextGame="vocab-quiz" styles={styles} />
    </div>
  );
}

/* ================================================================
   PAGE
   ================================================================ */
export default function SpeedVocabPage() {
  return (
    <Suspense>
      <SpeedVocabInner />
    </Suspense>
  );
}
