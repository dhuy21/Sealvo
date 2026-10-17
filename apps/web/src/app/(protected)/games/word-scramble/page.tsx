'use client';

import { Suspense, useState, useRef, useCallback } from 'react';
import { randomIndexExcept, shuffleArray } from '@/lib/shuffle';
import { formatTypeMeaning } from '@/lib/word-type';
import { launchSideCannons } from '@/components/games/confetti';
import { useGameShell } from '@/components/games/use-game-shell';
import { useCountdownTimer } from '@/components/games/use-countdown-timer';
import { GameDataStatus } from '@/components/games/GameDataStatus';
import { GameStats } from '@/components/games/GameStats';
import { GameFooter } from '@/components/games/GameFooter';
import { MagicalBackground } from '@/components/games/word-scramble/MagicalBackground';
import { WordScrambleRules } from '@/components/games/word-scramble/WordScrambleRules';
import { ScrambleBoard, type ScrambledWord } from '@/components/games/word-scramble/ScrambleBoard';
import { WordScrambleSummary } from '@/components/games/word-scramble/WordScrambleSummary';
import { scrambleWord } from '@/components/games/word-scramble/scramble-word';
import {
  POINTS_PER_WORD,
  accuracy as scrambleAccuracy,
  isPassed,
  timeLimit,
} from '@/components/games/word-scramble/scoring';
import { cx } from '@/lib/css-module';
import styles from '@/styles/games/word-scramble.module.css';

function WordScrambleInner() {
  const shell = useGameShell('word_scramble', { celebration: launchSideCannons });
  const { packageId, gameData, screen } = shell;
  const [words, setWords] = useState<ScrambledWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [input, setInput] = useState('');
  const [resultMessage, setResultMessage] = useState('');
  const [resultType, setResultType] = useState<'correct' | 'incorrect' | ''>('');
  const [canSkip, setCanSkip] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const currentWord = words[currentIndex] ?? null;
  const accuracy = scrambleAccuracy(correctAnswers, totalAttempts);

  function endGame() {
    shell.finish(score, isPassed(accuracy));
  }

  const [timer, setTimer] = useCountdownTimer(shell.playing, endGame);

  function startGame() {
    if (!gameData || gameData.errorMessage || gameData.words.length === 0) {
      shell.showRules();
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

    setTimer(timeLimit(shuffled.length));
    shell.start();

    setTimeout(() => inputRef.current?.focus(), 100);
  }

  // Old app rules: checking can be repeated on the same word (each correct check scores), the
  // attempt is counted when moving to the next word
  function checkAnswer() {
    if (!currentWord || !input.trim()) return;

    if (input.trim().toLowerCase() === currentWord.word.toLowerCase()) {
      setScore((prev) => prev + POINTS_PER_WORD);
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
    setTotalAttempts((prev) => prev + 1);
    setCanSkip(false);
    setInput('');
    setResultMessage('');
    setResultType('');

    setCurrentIndex(randomIndexExcept(words.length, currentIndex));
  }, [words.length, currentIndex]);

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

      <div className={cx(styles, 'game-header')}>
        <h1>Mots Mélangés</h1>
        <p className={cx(styles, 'game-description')}>Retrouvez les mots mélangés</p>
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
                  accuracy={accuracy}
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

      <GameFooter packageId={packageId} nextGame="flash-match" styles={styles} />
    </div>
  );
}

export default function WordScramblePage() {
  return (
    <Suspense>
      <WordScrambleInner />
    </Suspense>
  );
}
