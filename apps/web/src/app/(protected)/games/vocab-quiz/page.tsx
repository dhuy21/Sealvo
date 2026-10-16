'use client';

import { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGameData, useSaveScore } from '@/hooks/use-games';
import { useTimeouts } from '@/hooks/use-timeouts';
import { GameDataStatus } from '@/components/games/GameDataStatus';
import { GameStats } from '@/components/games/GameStats';
import { GameFooter } from '@/components/games/GameFooter';
import { useLevelTracking } from '@/components/games/use-level-tracking';
import { VocabQuizRules } from '@/components/games/vocab-quiz/VocabQuizRules';
import { QuizQuestion, type Question } from '@/components/games/vocab-quiz/QuizQuestion';
import { VocabQuizSummary } from '@/components/games/vocab-quiz/VocabQuizSummary';
import { FloatingQuizElements } from '@/components/games/vocab-quiz/FloatingQuizElements';
import { useQuizEffects } from '@/components/games/vocab-quiz/use-quiz-effects';
import { launchSnow } from '@/components/games/confetti';
import { useCelebration } from '@/components/games/use-celebration';
import {
  NOT_ENOUGH_WORDS_MESSAGE,
  generateQuestions,
  hasEnoughWords,
} from '@/components/games/vocab-quiz/generate-questions';
import { cx } from '@/lib/css-module';
import styles from '@/styles/games/vocab-quiz.module.css';

type Screen = 'pre' | 'active' | 'post';

function VocabQuizContent() {
  const searchParams = useSearchParams();
  const packageId = Number(searchParams.get('package'));

  const { data: gameData, isLoading, error } = useGameData('vocab_quiz', packageId || null);
  const saveScore = useSaveScore();
  const level = useLevelTracking('vocab_quiz');

  const [screen, setScreen] = useState<Screen>('pre');
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
  const [levelMessage, setLevelMessage] = useState<{ text: string; success: boolean } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const effects = useQuizEffects();
  const later = useTimeouts();
  const celebrate = useCelebration(launchSnow);

  const ready = !!gameData && !gameData.errorMessage;

  useEffect(() => {
    if (screen === 'active') {
      timerRef.current = setInterval(() => setCurrentTime((t) => t + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [screen]);

  const startGame = useCallback(() => {
    if (!gameData?.words?.length || gameData.errorMessage) {
      setScreen('pre');
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
    setLevelMessage(null);
    setScreen('active');
    effects.start();
    if (enough) effects.showQuestion();
  }, [gameData, effects]);

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
      clearInterval(timerRef.current);
      const total = questions.length;
      const isSuccessful = correctCount >= Math.ceil(total * 0.7);
      effects.finish(Math.round((correctCount / total) * 100));

      setLevelMessage({
        text: isSuccessful
          ? 'Excellent travail ! Progressez les autres jeux de ce niveau 😍'
          : 'Bon courage ! Réessayer ce jeu pour améliorer vos compétences 🤧',
        success: isSuccessful,
      });

      saveScore.mutate({ game_type: 'vocab_quiz', score });
      level.track(isSuccessful, packageId);

      later(() => {
        setScreen('post');
        celebrate();
      }, 1000);
    }
  }, [currentIdx, questions, correctCount, score, packageId, saveScore, level, effects, later, celebrate]);

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
        <GameDataStatus isLoading={isLoading} error={error} data={gameData} packageId={packageId} styles={styles} />
      )}

      {gameData && (screen !== 'pre' || ready) && (
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
