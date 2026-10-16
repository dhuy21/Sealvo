'use client';

import { Suspense, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGameData, useSaveScore, useTrackLevelProgress } from '@/hooks/use-games';
import { shuffleArray } from '@/lib/shuffle';
import { launchSideCannons } from '@/components/games/confetti';
import { levelCompletedMessage } from '@/components/games/level-progress';
import { GameDataStatus } from '@/components/games/GameDataStatus';
import { GameStats } from '@/components/games/GameStats';
import { GameFooter } from '@/components/games/GameFooter';
import type { LevelStatus } from '@/components/games/TrackLevelMessage';
import { MagicalBackground } from '@/components/games/word-scramble/MagicalBackground';
import { WordScrambleRules } from '@/components/games/word-scramble/WordScrambleRules';
import { ScrambleBoard, type ScrambledWord } from '@/components/games/word-scramble/ScrambleBoard';
import { WordScrambleSummary } from '@/components/games/word-scramble/WordScrambleSummary';

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
  const trackLevel = useTrackLevelProgress();

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

  const currentWord = words[currentIndex] ?? null;
  const ready = !!gameData && !gameData.errorMessage;

  // Prepare scrambled words from game data
  const scrambledWords = useMemo(() => {
    if (!gameData) return [];
    return gameData.words.map((w) => ({
      word: w.word,
      scrambled: scrambleWord(w.word),
      meaning: w.meaning,
    }));
  }, [gameData]);

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
    if (!ready || scrambledWords.length === 0) {
      setScreen('pre');
      return;
    }

    const shuffled = shuffleArray(scrambledWords);
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

    const gameTimer = 110 + scrambledWords.length * 9;
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

    setTimeout(() => inputRef.current?.focus(), 50);
  }, [words.length, currentIndex]);

  function endGame() {
    clearInterval(timerRef.current);
    const accuracy = totalAttempts > 0 ? Math.round((correctAnswers / totalAttempts) * 100) : 0;
    const isSuccessful = accuracy >= 80;

    saveScore.mutate({ game_type: 'word_scramble', score });

    trackLevel.mutate(
      { game_type: 'word_scramble', completed: isSuccessful, packageId: packageId! },
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
      launchSideCannons();
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
      <div className="game-container">
        <div className="error-box">
          <i className="fas fa-exclamation-triangle"></i>
          <p>Aucun package sélectionné.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="game-container">
      <MagicalBackground />

      {/* Header */}
      <div className="game-header">
        <h1>Word Scramble</h1>
        <p className="game-description">Retrouvez les mots mélangés</p>
      </div>

      {screen === 'pre' && (
        <GameDataStatus isLoading={isLoading} error={error} data={gameData} packageId={packageId} />
      )}

      {gameData && (screen !== 'pre' || ready) && (
        <>
          <GameStats wordCount={gameData.wordCount} />

          <div className="game-area">
            <div className="game-screen">
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
                  onReplay={startGame}
                />
              )}
            </div>
          </div>
        </>
      )}

      <GameFooter packageId={packageId} nextGame="phrase-completion" />
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
