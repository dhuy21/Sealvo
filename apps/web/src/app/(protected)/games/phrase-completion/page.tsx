'use client';

import { Suspense, useState, useRef, useCallback } from 'react';
import { launchStars } from '@/components/games/confetti';
import { useGameShell } from '@/components/games/use-game-shell';
import { useCountdownTimer } from '@/components/games/use-countdown-timer';
import { GameDataStatus } from '@/components/games/GameDataStatus';
import { GameStats } from '@/components/games/GameStats';
import { GameFooter } from '@/components/games/GameFooter';
import { StarryBackground } from '@/components/games/phrase-completion/StarryBackground';
import { PhraseCompletionRules } from '@/components/games/phrase-completion/PhraseCompletionRules';
import { PhraseBoard } from '@/components/games/phrase-completion/PhraseBoard';
import { PhraseCompletionSummary } from '@/components/games/phrase-completion/PhraseCompletionSummary';
import { useTypewriter } from '@/components/games/phrase-completion/use-typewriter';
import {
  escapeHtml,
  generatePhrases,
  repeatPhrases,
  revealAnswers,
  type Phrase,
} from '@/components/games/phrase-completion/phrases';
import { cx } from '@/lib/css-module';
import styles from '@/styles/games/phrase-completion.module.css';

/* ================================================================
   INNER COMPONENT
   ================================================================ */
function PhraseCompletionInner() {
  const shell = useGameShell('phrase_completion', { celebration: launchStars });
  const { packageId, gameData, screen } = shell;
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [input, setInput] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackType, setFeedbackType] = useState<'correct' | 'incorrect' | ''>('');
  const [answered, setAnswered] = useState(false);
  const [displayPhrase, setDisplayPhrase] = useState('');
  const [meaningText, setMeaningText] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const questionStartRef = useRef(0);
  const attemptsRef = useRef(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const showTypedText = useCallback((text: string) => setDisplayPhrase(escapeHtml(text)), []);
  const typewriter = useTypewriter(showTypedText);

  const currentPhrase = phrases[currentIndex] ?? null;

  function endGame() {
    typewriter.stop();
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    shell.finish(score, accuracy >= 80);
  }

  const [timer, setTimer] = useCountdownTimer(shell.playing, endGame);

  function startGame() {
    if (!gameData || gameData.errorMessage) {
      shell.showRules();
      return;
    }

    const generated = generatePhrases(gameData.words);

    const availableWords = gameData.wordCount;
    const totalQ = Math.min(availableWords, 100) + Math.floor(0.5 * availableWords);
    setTotalQuestions(totalQ);

    const extendedPhrases = repeatPhrases(generated, totalQ);

    setPhrases(extendedPhrases);
    setCurrentIndex(0);
    setScore(0);
    setCorrectAnswers(0);
    setStreak(0);
    setBestStreak(0);
    setInput('');
    setFeedbackMessage('');
    setFeedbackType('');
    setAnswered(false);
    setMeaningText('');
    typewriter.type(extendedPhrases[0].phrase);

    setTimer(200 + 4 * totalQ);
    questionStartRef.current = Date.now();
    attemptsRef.current = 0;
    shell.start();

    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function checkAnswer() {
    if (!currentPhrase || answered) return;

    const userInputs = input.trim().split(';').map((s) => s.trim().toLowerCase());
    const correctWordsLower = currentPhrase.correctWords.map((w) => w.toLowerCase());

    attemptsRef.current++;

    if (!input.trim()) {
      setFeedbackMessage('Veuillez saisir un mot');
      setFeedbackType('');
      return;
    }

    const questionTime = (Date.now() - questionStartRef.current) / 1000;

    const isCorrect =
      userInputs.length === correctWordsLower.length &&
      userInputs.every((val, i) => val === correctWordsLower[i]);

    setAnswered(true);
    typewriter.stop();
    setMeaningText(`Signification: ${currentPhrase.meaningWord}`);

    if (isCorrect) {
      setCorrectAnswers((prev) => prev + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      setBestStreak((prev) => Math.max(prev, newStreak));

      const basePoints = 10;
      const timeBonus = Math.max(0, Math.min(5, Math.round(10 - questionTime)));
      const streakBonus = Math.floor(newStreak / 3) * 5;
      const attemptsPenalty = Math.max(0, attemptsRef.current - 1) * 2;
      const totalPoints = basePoints + timeBonus + streakBonus - attemptsPenalty;
      setScore((prev) => prev + totalPoints);

      setFeedbackMessage(`Correct ! +${totalPoints} points`);
      setFeedbackType('correct');
      setDisplayPhrase(revealAnswers(currentPhrase, cx(styles, 'blank', 'correct')));
    } else {
      setStreak(0);

      setFeedbackMessage(`Incorrect. La bonne réponse était "${currentPhrase.correctWords.join(' ')}"`);
      setFeedbackType('incorrect');
      setDisplayPhrase(revealAnswers(currentPhrase, cx(styles, 'blank', 'incorrect')));
    }
  }

  function goToNext() {
    const nextIdx = currentIndex + 1;

    if (nextIdx >= totalQuestions) {
      endGame();
      return;
    }

    setCurrentIndex(nextIdx);
    setInput('');
    setFeedbackMessage('');
    setFeedbackType('');
    setAnswered(false);
    setMeaningText('');
    typewriter.type(phrases[nextIdx]?.phrase ?? '');
    questionStartRef.current = Date.now();
    attemptsRef.current = 0;

    setTimeout(() => inputRef.current?.focus(), 50);
  }

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
    <div className={cx(styles, 'game-container', 'enhanced-starry-mode')}>
      <StarryBackground />

      {/* Header */}
      <div className={cx(styles, 'game-header')}>
        <h1>Complétion de Phrase</h1>
        <p className={cx(styles, 'game-description')}>Complétez les phrases avec les mots appris</p>
      </div>

      {screen === 'pre' && (
        <GameDataStatus isLoading={shell.isLoading} error={shell.error} data={gameData} packageId={packageId} styles={styles} />
      )}

      {gameData && (screen !== 'pre' || shell.ready) && (
        <>
          <GameStats gameType="phrase_completion" wordCount={gameData.wordCount} styles={styles} />

          {screen === 'pre' && <PhraseCompletionRules onStart={startGame} />}

          {screen === 'active' && currentPhrase && (
            <PhraseBoard
              score={score}
              currentIndex={currentIndex}
              totalQuestions={totalQuestions}
              timer={timer}
              answered={answered}
              displayPhrase={displayPhrase}
              input={input}
              inputRef={inputRef}
              meaningText={meaningText}
              feedbackMessage={feedbackMessage}
              feedbackType={feedbackType}
              onInputChange={setInput}
              onCheck={checkAnswer}
              onNext={goToNext}
            />
          )}

          {screen === 'post' && (
            <PhraseCompletionSummary
              score={score}
              correctAnswers={correctAnswers}
              totalQuestions={totalQuestions}
              bestStreak={bestStreak}
              levelMessage={shell.levelMessage}
              levelStatus={shell.levelStatus}
              levelFinished={shell.levelFinished}
              packageId={packageId}
              onReplay={startGame}
            />
          )}
        </>
      )}

      <GameFooter packageId={packageId} nextGame="word-search" styles={styles} />
    </div>
  );
}

/* ================================================================
   PAGE
   ================================================================ */
export default function PhraseCompletionPage() {
  return (
    <Suspense>
      <PhraseCompletionInner />
    </Suspense>
  );
}
