'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGameData, useSaveScore, useTrackLevelProgress } from '@/hooks/use-games';
import { shuffleArray } from '@/lib/shuffle';
import { launchEmbers } from '@/components/games/confetti';
import { levelCompletedMessage } from '@/components/games/level-progress';
import { GameDataStatus } from '@/components/games/GameDataStatus';
import { GameStats } from '@/components/games/GameStats';
import { GameFooter } from '@/components/games/GameFooter';
import type { LevelStatus } from '@/components/games/TrackLevelMessage';
import { SpeedVocabRules } from '@/components/games/speed-vocab/SpeedVocabRules';
import { SpeedVocabBoard } from '@/components/games/speed-vocab/SpeedVocabBoard';
import { SpeedVocabSummary } from '@/components/games/speed-vocab/SpeedVocabSummary';

/* ================================================================
   INNER COMPONENT
   ================================================================ */
function SpeedVocabInner() {
  const searchParams = useSearchParams();
  const packageId = searchParams.get('package') ? Number(searchParams.get('package')) : null;

  const { data: gameData, isLoading, error } = useGameData('speed_vocab', packageId);
  const saveScore = useSaveScore();
  const trackLevel = useTrackLevelProgress();

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
  const [levelMessage, setLevelMessage] = useState('');
  const [levelStatus, setLevelStatus] = useState<LevelStatus>('');

  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  function startGame() {
    if (!gameData || gameData.errorMessage || gameData.words.length === 0) {
      setScreen('pre');
      return;
    }

    const prepared = gameData.words.map((w) => ({ word: w.word, meaning: w.meaning }));
    const shuffled = shuffleArray(prepared);
    setWords(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setWordsTyped(0);
    setCorrectWords(0);
    setInput('');
    setInputFeedback('');
    setLevelMessage('');
    setLevelStatus('');

    const gameTimer = 100 + shuffled.length * 6;
    setTimer(gameTimer);
    setScreen('active');

    setTimeout(() => inputRef.current?.focus(), 100);
  }

  const moveToNext = useCallback((isCorrect: boolean) => {
    let nextIndex = Math.floor(Math.random() * words.length);
    while (nextIndex === currentIndex && words.length > 1) {
      nextIndex = Math.floor(Math.random() * words.length);
    }

    if (isCorrect) {
      setInputFeedback('correct');
      setInput('');
      setCurrentIndex(nextIndex);
      setTimeout(() => setInputFeedback(''), 300);
    } else {
      setInputFeedback('incorrect');
      setTimeout(() => {
        setInputFeedback('');
        setInput('');
        setCurrentIndex(nextIndex);
      }, 500);
    }
  }, [words.length, currentIndex]);

  function handleInput(value: string) {
    if (!currentWord) return;
    setInput(value);

    const userInput = value.trim().toLowerCase();
    const correctWord = currentWord.word.trim().toLowerCase();

    if (userInput === correctWord) {
      // Correct
      setWordsTyped((p) => p + 1);
      setCorrectWords((p) => p + 1);

      const newStreak = streak + 1;
      setStreak(newStreak);
      setBestStreak((p) => Math.max(p, newStreak));

      let wordPoints = 10;
      wordPoints += Math.max(0, correctWord.length - 4); // length bonus
      wordPoints += Math.floor(newStreak / 3) * 5; // streak bonus
      setScore((p) => p + wordPoints);

      moveToNext(true);
    } else if (userInput.length >= correctWord.length) {
      // Incorrect (typed enough chars but wrong)
      setWordsTyped((p) => p + 1);
      setStreak(0);
      moveToNext(false);
    }
  }

  function endGame() {
    clearInterval(timerRef.current);
    const accuracy = wordsTyped > 0 ? Math.round((correctWords / wordsTyped) * 100) : 0;
    const isSuccessful = accuracy >= 70;

    saveScore.mutate({ game_type: 'speed_vocab', score });

    trackLevel.mutate(
      { game_type: 'speed_vocab', completed: isSuccessful, packageId: packageId! },
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
      launchEmbers();
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
      <div className="game-container" id="speed-vocab">
        <div className="error-box">
          <i className="fas fa-exclamation-triangle"></i>
          <p>Aucun package sélectionné.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="game-container" id="speed-vocab" data-package={packageId}>
      {/* Header */}
      <div className="game-header">
        <h1>Speed Vocab</h1>
        <p className="game-description">Tapez les mots le plus vite possible</p>
      </div>

      {screen === 'pre' && (
        <GameDataStatus isLoading={isLoading} error={error} data={gameData} packageId={packageId} />
      )}

      {gameData && (screen !== 'pre' || ready) && (
        <>
          <GameStats wordCount={gameData.wordCount} />

          <div className="game-area">
            <div className="game-screen">
              {screen === 'pre' && <SpeedVocabRules onStart={startGame} />}

              {screen === 'active' && currentWord && (
                <SpeedVocabBoard
                  currentWord={currentWord}
                  score={score}
                  streak={streak}
                  timer={timer}
                  input={input}
                  inputRef={inputRef}
                  inputFeedback={inputFeedback}
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
                  onReplay={startGame}
                />
              )}
            </div>
          </div>
        </>
      )}

      <GameFooter packageId={packageId} nextGame="word-search" />
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
