'use client';

import { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { GameDataStatus } from '@/components/games/GameDataStatus';
import { GameStats } from '@/components/games/GameStats';
import { GameFooter } from '@/components/games/GameFooter';
import { useGameShell } from '@/components/games/use-game-shell';
import { VocabQuizRules } from '@/components/games/vocab-quiz/VocabQuizRules';
import { QuizQuestion, type Question } from '@/components/games/vocab-quiz/QuizQuestion';
import { VocabQuizSummary } from '@/components/games/vocab-quiz/VocabQuizSummary';
import { FloatingQuizElements } from '@/components/games/vocab-quiz/FloatingQuizElements';
import { useQuizEffects } from '@/components/games/vocab-quiz/use-quiz-effects';
import { launchSnow } from '@/components/games/confetti';
import {
  NOT_ENOUGH_WORDS_MESSAGE,
  generateQuestions,
  hasEnoughWords,
} from '@/components/games/vocab-quiz/generate-questions';
import { cx } from '@/lib/css-module';
import styles from '@/styles/games/vocab-quiz.module.css';

function VocabQuizContent() {
  const shell = useGameShell('vocab_quiz', { celebration: launchSnow });
  const { packageId, gameData, screen } = shell;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [lastSelected, setLastSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [quizError, setQuizError] = useState('');
  const [resultMsg, setResultMsg] = useState<{ text: string; correct: boolean } | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const effects = useQuizEffects();

  useEffect(() => {
    if (screen === 'active') {
      timerRef.current = setInterval(() => setCurrentTime((t) => t + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [screen]);

  const startGame = useCallback(() => {
    if (!gameData?.words?.length || gameData.errorMessage) {
      shell.showRules();
      return;
    }
    const enough = hasEnoughWords(gameData.words);
    setQuizError(enough ? '' : NOT_ENOUGH_WORDS_MESSAGE);
    setQuestions(enough ? generateQuestions(gameData.words) : []);
    setCurrentIdx(0);
    setScore(0);
    setCorrectCount(0);
    setSelected([]);
    setLastSelected(null);
    setAnswered(false);
    setResultMsg(null);
    setCurrentTime(0);
    shell.start();
    effects.start();
    if (enough) effects.showQuestion();
  }, [gameData, shell, effects]);

  const handleAnswer = useCallback(
    (optIdx: number) => {
      if (answered) return;
      const q = questions[currentIdx];
      const nextSelected = [...selected, optIdx];
      setSelected(nextSelected);
      setLastSelected(optIdx);
      if (nextSelected.length !== q.correctIndex.length) return;

      setAnswered(true);
      const isCorrect = nextSelected.every((i) => q.correctIndex.includes(i));
      effects.answer(isCorrect);
      if (isCorrect) {
        setScore((s) => s + 10 * nextSelected.length);
        setCorrectCount((c) => c + 1);
        setResultMsg({ text: 'Excellent ! 🎉', correct: true });
      } else {
        setScore((s) => Math.max(0, s - 5 * nextSelected.length));
        setResultMsg({ text: 'Pas tout à fait... 💭', correct: false });
      }
    },
    [answered, questions, currentIdx, selected, effects],
  );

  const nextQuestion = useCallback(() => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((i) => i + 1);
      setSelected([]);
      setLastSelected(null);
      setAnswered(false);
      setResultMsg(null);
      effects.showQuestion();
    } else {
      // End game
      const total = questions.length;
      if (!shell.finish(score, correctCount >= Math.ceil(total * 0.7))) return;
      clearInterval(timerRef.current);
      effects.finish(Math.round((correctCount / total) * 100));
    }
  }, [currentIdx, questions, correctCount, score, shell, effects]);

  if (!packageId) {
    return (
      <div className={cx(styles, 'game-container')} style={{ textAlign: 'center', padding: '4rem' }}>
        <p>Aucun package sélectionné.</p>
      </div>
    );
  }

  const currentQ = questions[currentIdx];

  return (
    <div className={cx(styles, 'game-container', effects.enhancedMode && 'enhanced-quiz-mode')}>
      <FloatingQuizElements />
      <div className={cx(styles, 'game-header')}>
        <h1>Quiz de Vocabulaire</h1>
        <p className={cx(styles, 'game-description')}>Choisissez la bonne définition pour chaque mot</p>
      </div>

      {screen === 'pre' && (
        <GameDataStatus isLoading={shell.isLoading} error={shell.error} data={gameData} packageId={packageId} styles={styles} />
      )}

      {gameData && (screen !== 'pre' || shell.ready) && (
        <>
          <GameStats gameType="vocab_quiz" wordCount={gameData.wordCount} styles={styles} />

          <div className={cx(styles, 'game-area')}>
            <div className={cx(styles, 'game-screen')}>
              {screen === 'pre' && <VocabQuizRules onStart={startGame} />}

              {screen === 'active' && quizError && (
                <div className={cx(styles, 'active-game-screen', 'active')}>
                  <div className={cx(styles, 'result-message', 'incorrect')}>{quizError}</div>
                </div>
              )}

              {screen === 'active' && currentQ && (
                <QuizQuestion
                  question={currentQ}
                  questionNumber={currentIdx + 1}
                  totalQuestions={questions.length}
                  score={score}
                  selected={selected}
                  lastSelected={lastSelected}
                  answered={answered}
                  flags={effects.screenFlags}
                  resultMsg={resultMsg}
                  onAnswer={handleAnswer}
                  onNext={nextQuestion}
                />
              )}

              {screen === 'post' && (
                <VocabQuizSummary
                  score={score}
                  correctCount={correctCount}
                  currentTime={currentTime}
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

      <GameFooter packageId={packageId} nextGame="phrase-completion" styles={styles} />
    </div>
  );
}

export default function VocabQuizPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <i className="fas fa-spinner fa-spin fa-2x"></i>
        </div>
      }
    >
      <VocabQuizContent />
    </Suspense>
  );
}
