'use client';

import { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGameData, useSaveScore, useTrackLevelProgress } from '@/hooks/use-games';
import type { GameWord } from '@/hooks/use-games';
import { shuffleArray } from '@/lib/shuffle';
import { GameDataStatus } from '@/components/games/GameDataStatus';
import { GameStats } from '@/components/games/GameStats';
import { GameFooter } from '@/components/games/GameFooter';
import { VocabQuizRules } from '@/components/games/vocab-quiz/VocabQuizRules';
import { QuizQuestion, type Question } from '@/components/games/vocab-quiz/QuizQuestion';
import { VocabQuizSummary } from '@/components/games/vocab-quiz/VocabQuizSummary';

function generateQuestions(words: GameWord[]): Question[] {
  const questions: Question[] = [];
  const shuffled = shuffleArray(words);
  const count = Math.min(shuffled.length, 10);

  for (let i = 0; i < count; i++) {
    const correct = shuffled[i];
    // Pick 3 random wrong answers
    const others = words.filter((w) => w.detail_id !== correct.detail_id);
    const wrongOptions = shuffleArray(others).slice(0, 3).map((w) => w.meaning);
    const allOptions = shuffleArray([...wrongOptions, correct.meaning]);
    const correctIndex = allOptions.indexOf(correct.meaning);

    questions.push({
      word: correct.word,
      options: allOptions,
      correctIndex: [correctIndex],
    });
  }

  return questions;
}

type Screen = 'pre' | 'active' | 'post';

function VocabQuizContent() {
  const searchParams = useSearchParams();
  const packageId = Number(searchParams.get('package'));

  const { data: gameData, isLoading, error } = useGameData('vocab_quiz', packageId || null);
  const saveScore = useSaveScore();
  const trackProgress = useTrackLevelProgress();

  const [screen, setScreen] = useState<Screen>('pre');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ text: string; correct: boolean } | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [levelMessage, setLevelMessage] = useState<{ text: string; success: boolean } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

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
    const qs = generateQuestions(gameData.words);
    setQuestions(qs);
    setCurrentIdx(0);
    setScore(0);
    setCorrectCount(0);
    setSelectedOption(null);
    setAnswered(false);
    setResultMsg(null);
    setCurrentTime(0);
    setLevelMessage(null);
    setScreen('active');
  }, [gameData]);

  const handleAnswer = useCallback(
    (optIdx: number) => {
      if (answered) return;
      setSelectedOption(optIdx);
      setAnswered(true);

      const q = questions[currentIdx];
      const isCorrect = q.correctIndex.includes(optIdx);

      if (isCorrect) {
        setScore((s) => s + 10);
        setCorrectCount((c) => c + 1);
        setResultMsg({ text: 'Excellent ! 🎉', correct: true });
      } else {
        setScore((s) => Math.max(0, s - 5));
        setResultMsg({ text: 'Pas tout à fait... 💭', correct: false });
      }
    },
    [answered, questions, currentIdx],
  );

  const nextQuestion = useCallback(() => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((i) => i + 1);
      setSelectedOption(null);
      setAnswered(false);
      setResultMsg(null);
    } else {
      // End game
      clearInterval(timerRef.current);
      const total = questions.length;
      const isSuccessful = correctCount >= Math.ceil(total * 0.7);

      setLevelMessage({
        text: isSuccessful
          ? 'Excellent travail ! Progressez les autres jeux de ce niveau 😍'
          : 'Bon courage ! Réessayer ce jeu pour améliorer vos compétences 🤧',
        success: isSuccessful,
      });

      saveScore.mutate({ game_type: 'vocab_quiz', score });
      trackProgress.mutate({ game_type: 'vocab_quiz', completed: isSuccessful, packageId });

      setTimeout(() => setScreen('post'), 500);
    }
  }, [currentIdx, questions, correctCount, score, packageId, saveScore, trackProgress]);

  if (!packageId) {
    return (
      <div className="game-container" style={{ textAlign: 'center', padding: '4rem' }}>
        <p>Aucun package sélectionné.</p>
      </div>
    );
  }

  const currentQ = questions[currentIdx];

  return (
    <div className="game-container">
      <div className="game-header">
        <h1>Vocab Quiz</h1>
        <p className="game-description">Choisissez la bonne définition pour chaque mot</p>
      </div>

      {screen === 'pre' && (
        <GameDataStatus isLoading={isLoading} error={error} data={gameData} packageId={packageId} />
      )}

      {gameData && (screen !== 'pre' || ready) && (
        <>
          <GameStats wordCount={gameData.wordCount} />

          <div className="game-area">
            <div className="game-screen">
              {screen === 'pre' && <VocabQuizRules onStart={startGame} />}

              {screen === 'active' && currentQ && (
                <QuizQuestion
                  question={currentQ}
                  questionNumber={currentIdx + 1}
                  totalQuestions={questions.length}
                  score={score}
                  selectedOption={selectedOption}
                  answered={answered}
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
                  onReplay={startGame}
                />
              )}
            </div>
          </div>
        </>
      )}

      <GameFooter packageId={packageId} nextGame="test-pronun" />
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
