'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGameData, useSaveScore, type GameWord } from '@/hooks/use-games';
import { useTimeouts } from '@/hooks/use-timeouts';
import { shuffleArray } from '@/lib/shuffle';
import { launchStars } from '@/components/games/confetti';
import { useCelebration } from '@/components/games/use-celebration';
import { useLevelTracking } from '@/components/games/use-level-tracking';
import { GameDataStatus } from '@/components/games/GameDataStatus';
import { GameStats } from '@/components/games/GameStats';
import { GameFooter } from '@/components/games/GameFooter';
import type { LevelStatus } from '@/components/games/TrackLevelMessage';
import { StarryBackground } from '@/components/games/phrase-completion/StarryBackground';
import { PhraseCompletionRules } from '@/components/games/phrase-completion/PhraseCompletionRules';
import { PhraseBoard } from '@/components/games/phrase-completion/PhraseBoard';
import { PhraseCompletionSummary } from '@/components/games/phrase-completion/PhraseCompletionSummary';
import { useTypewriter } from '@/components/games/phrase-completion/use-typewriter';
import { cx } from '@/lib/css-module';
import styles from '@/styles/games/phrase-completion.module.css';

/* ================================================================
   TYPES & HELPERS
   ================================================================ */
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
interface Phrase {
  phrase: string;
  word: string;
  meaningWord: string;
  correctWords: string[];
}

/** One phrase per word; an example without `**…**` (or no example) gives a phrase with no blank. */
function generatePhrases(words: GameWord[]): Phrase[] {
  const phrases = words.map((w) => {
    let phrase = '';
    let correctWords: string[] = [];

    if (w.example && w.example.trim() !== '') {
      const regex = /\*\*([^*]+)\*\*/g;
      correctWords = [...w.example.matchAll(regex)].map((m) => m[1]);
      phrase = w.example.replace(regex, '_____');
    }
    return { phrase, word: w.word, meaningWord: w.meaning, correctWords };
  });
  return shuffleArray(phrases);
}

/* ================================================================
   INNER COMPONENT
   ================================================================ */
function PhraseCompletionInner() {
  const searchParams = useSearchParams();
  const packageId = searchParams.get('package') ? Number(searchParams.get('package')) : null;

  const { data: gameData, isLoading, error } = useGameData('phrase_completion', packageId);
  const saveScore = useSaveScore();
  const level = useLevelTracking('phrase_completion');

  type Screen = 'pre' | 'active' | 'post';
  const [screen, setScreen] = useState<Screen>('pre');
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timer, setTimer] = useState(0);
  const [input, setInput] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackType, setFeedbackType] = useState<'correct' | 'incorrect' | ''>('');
  const [answered, setAnswered] = useState(false);
  const [displayPhrase, setDisplayPhrase] = useState('');
  const [meaningText, setMeaningText] = useState('');
  const [levelMessage, setLevelMessage] = useState('');
  const [levelStatus, setLevelStatus] = useState<LevelStatus>('');
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const questionStartRef = useRef(0);
  const attemptsRef = useRef(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const showTypedText = useCallback((text: string) => setDisplayPhrase(escapeHtml(text)), []);
  const typewriter = useTypewriter(showTypedText);
  const later = useTimeouts();
  const celebrate = useCelebration(launchStars);

  const currentPhrase = phrases[currentIndex] ?? null;
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
    if (!gameData || gameData.errorMessage) {
      setScreen('pre');
      return;
    }

    const generated = generatePhrases(gameData.words);

    const availableWords = gameData.wordCount;
    const totalQ = Math.min(availableWords, 100) + Math.floor(0.5 * availableWords);
    setTotalQuestions(totalQ);

    // Extend phrases array to cover totalQ
    const extendedPhrases: Phrase[] = [];
    for (let i = 0; i < totalQ; i++) {
      extendedPhrases.push(generated[i % generated.length]);
    }

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
    setLevelMessage('');
    setLevelStatus('');
    typewriter.type(extendedPhrases[0].phrase);

    const gameTimer = 200 + 4 * totalQ;
    setTimer(gameTimer);
    questionStartRef.current = Date.now();
    attemptsRef.current = 0;
    setScreen('active');

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

      // Replace blanks with correct words in green
      let updated = escapeHtml(currentPhrase.phrase);
      for (const w of currentPhrase.correctWords) {
        updated = updated.replace('_____', `<span class="${cx(styles, 'blank', 'correct')}">${escapeHtml(w)}</span>`);
      }
      setDisplayPhrase(updated);
    } else {
      setStreak(0);

      setFeedbackMessage(`Incorrect. La bonne réponse était "${currentPhrase.correctWords.join(' ')}"`);
      setFeedbackType('incorrect');

      let updated = escapeHtml(currentPhrase.phrase);
      for (const w of currentPhrase.correctWords) {
        updated = updated.replace('_____', `<span class="${cx(styles, 'blank', 'incorrect')}">${escapeHtml(w)}</span>`);
      }
      setDisplayPhrase(updated);
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

  function endGame() {
    clearInterval(timerRef.current);
    typewriter.stop();
    const totalQ = totalQuestions;
    const accuracy = totalQ > 0 ? Math.round((correctAnswers / totalQ) * 100) : 0;
    const isSuccessful = accuracy >= 80;

    saveScore.mutate({ game_type: 'phrase_completion', score });

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
    if (screen === 'active' && timer === 0 && phrases.length > 0) {
      endGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer, screen]);

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
        <GameDataStatus isLoading={isLoading} error={error} data={gameData} packageId={packageId} styles={styles} />
      )}

      {gameData && (screen !== 'pre' || ready) && (
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
              levelMessage={levelMessage}
              levelStatus={levelStatus}
              levelFinished={level.levelFinished}
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
