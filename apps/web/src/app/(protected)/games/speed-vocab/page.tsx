'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { randomIndexExcept, shuffleArray } from '@/lib/shuffle';
import { launchEmbers } from '@/components/games/confetti';
import { useGameShell } from '@/components/games/use-game-shell';
import { useCountdownTimer } from '@/components/games/use-countdown-timer';
import { GameDataStatus } from '@/components/games/GameDataStatus';
import { GameStats } from '@/components/games/GameStats';
import { GameFooter } from '@/components/games/GameFooter';
import { SpeedVocabRules } from '@/components/games/speed-vocab/SpeedVocabRules';
import { SpeedVocabBoard } from '@/components/games/speed-vocab/SpeedVocabBoard';
import { SpeedVocabSummary } from '@/components/games/speed-vocab/SpeedVocabSummary';
import { playErrorSound, playSuccessSound } from '@/components/games/speed-vocab/speed-sounds';
import { useSpeedBackground } from '@/components/games/speed-vocab/use-speed-background';
import { isPassed, timeLimit, wordPoints } from '@/components/games/speed-vocab/scoring';
import { useTransientFlag } from '@/components/games/use-transient-flag';
import { cx } from '@/lib/css-module';
import { formatTypeMeaning } from '@/lib/word-type';
import styles from '@/styles/games/speed-vocab.module.css';

function SpeedVocabInner() {
  const shell = useGameShell('speed_vocab', { celebration: launchEmbers, trackOnSummary: true });
  const { packageId, gameData, screen } = shell;
  const [words, setWords] = useState<{ word: string; meaning: string }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
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

  const inputRef = useRef<HTMLInputElement | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Its callback moves to the next word: it must not run once the page is left
  useEffect(() => () => clearTimeout(feedbackTimeoutRef.current), []);
  const wrongPendingRef = useRef(false);

  const currentWord = words[currentIndex] ?? null;

  function endGame() {
    shell.finish(score, isPassed(correctWords, wordsTyped));
  }

  const [timer, setTimer] = useCountdownTimer(shell.playing, endGame);
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
      shell.showRules();
      return;
    }

    const prepared = gameData.words.map((w) => ({
      word: w.word,
      meaning: formatTypeMeaning(w.type, w.meaning),
    }));
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

    setTimer(timeLimit(shuffled.length));
    shell.start();

    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function nextIndex() {
    return randomIndexExcept(words.length, currentIndex);
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

      const points = wordPoints(correctWord, newStreak);
      setScore((p) => p + points);

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
      <div className={cx(styles, 'game-header')}>
        <h1>Vitesse Vocab</h1>
        <p className={cx(styles, 'game-description')}>Tapez les mots le plus vite possible</p>
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
              wpm={correctWords}
              levelMessage={shell.levelMessage}
              levelStatus={shell.levelStatus}
              levelFinished={shell.levelFinished}
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

export default function SpeedVocabPage() {
  return (
    <Suspense>
      <SpeedVocabInner />
    </Suspense>
  );
}
