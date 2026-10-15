'use client';

import { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useGameData, useSaveScore, useTrackLevelProgress } from '@/hooks/use-games';
import type { GameWord } from '@/hooks/use-games';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

interface Question {
  word: string;
  options: string[];
  correctIndex: number[];
}

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
  const router = useRouter();
  const packageId = Number(searchParams.get('package'));

  const { data: gameData, isLoading } = useGameData('vocab_quiz', packageId || null);
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

  useEffect(() => {
    if (screen === 'active') {
      timerRef.current = setInterval(() => setCurrentTime((t) => t + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [screen]);

  const startGame = useCallback(() => {
    if (!gameData?.words?.length) return;
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

  if (isLoading) {
    return (
      <div className="game-container" style={{ textAlign: 'center', padding: '4rem' }}>
        <i className="fas fa-spinner fa-spin fa-2x"></i>
      </div>
    );
  }

  if (gameData?.errorMessage) {
    return (
      <div className="game-container">
        <div className="game-header">
          <h1>Vocab Quiz</h1>
        </div>
        <div className="error-box">
          <i className="fas fa-exclamation-triangle"></i>
          <p>{gameData.errorMessage}</p>
          <button className="btn add-words-btn" onClick={() => router.push(`/words?package=${packageId}`)}>
            Ajouter des mots
          </button>
        </div>
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

      {gameData && (
        <div className="game-stats">
          <div className="stat-box">
            <span className="stat-label">Mots disponibles</span>
            <span className="stat-value">{gameData.wordCount}</span>
          </div>
        </div>
      )}

      <div className="game-area">
        <div className="game-screen">
          {/* Pre-game */}
          {screen === 'pre' && (
            <div className="pre-game-screen active">
              <h2>
                <i className="fas fa-bolt" style={{ color: '#e9e919' }}></i> Règles du jeu
              </h2>
              <ul className="rules-list">
                <li>Choisissez la bonne définition pour chaque mot</li>
                <li>Obtenez 10 points pour chaque bonne réponse</li>
                <li>Perdez 5 points pour chaque réponse erronée</li>
                <li>Répondez à toutes les questions pour terminer le quiz</li>
              </ul>
              <button className="start-btn" onClick={startGame}>
                <i className="fas fa-play"></i> Commencer
              </button>
            </div>
          )}

          {/* Active game */}
          {screen === 'active' && currentQ && (
            <div className="active-game-screen active">
              <div className="game-info">
                <div className="score-display">
                  <span className="score-label">Score</span>
                  <span className="score-value">{score}</span>
                </div>
                <div className="progress-display">
                  <span className="progress-label">Question</span>
                  <span className="progress-value">
                    {currentIdx + 1}/{questions.length}
                  </span>
                </div>
              </div>

              <div className="quiz-question-container">
                <div className="quiz-word-container">
                  <div className="quiz-word">{currentQ.word}</div>
                </div>

                <div className="options-container">
                  {currentQ.options.map((opt, i) => (
                    <button
                      key={i}
                      className={`option-btn${selectedOption === i ? (currentQ.correctIndex.includes(i) ? ' correct' : ' incorrect') : ''}${answered && currentQ.correctIndex.includes(i) ? ' correct' : ''}`}
                      onClick={() => handleAnswer(i)}
                      disabled={answered}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {resultMsg && (
                <div className={`result-message ${resultMsg.correct ? 'correct' : 'incorrect'}`}>
                  {resultMsg.text}
                </div>
              )}

              <div className="quiz-footer">
                <button className="next-btn" disabled={!answered} onClick={nextQuestion}>
                  {currentIdx + 1 === questions.length ? 'Voir les résultats' : 'Question suivante'}
                </button>
              </div>
            </div>
          )}

          {/* Post-game */}
          {screen === 'post' && (
            <div className="post-game-screen active">
              <div className="final-score-container">
                <div className="final-score-label">Score final</div>
                <span className="final-score">{score}</span>
              </div>
              <div className="game-summary">
                <div className="summary-item">
                  <div className="summary-icon">☘️Corrects</div>
                  <span className="summary-value">{correctCount}</span>
                </div>
                <div className="summary-item">
                  <div className="summary-icon">⏰Temps</div>
                  <span className="summary-value">{formatTime(currentTime)}</span>
                </div>
              </div>

              {levelMessage && (
                <div
                  className={`track-level-message ${levelMessage.success ? 'level-completed' : 'level-failed'}`}
                >
                  {levelMessage.text}
                </div>
              )}

              <div className="action-buttons">
                <button className="play-again-btn" onClick={startGame}>
                  <i className="fas fa-redo"></i> Rejouer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="game-footer">
        <button className="btn learn-btn" onClick={() => router.push(`/learn?package=${packageId}`)}>
          <i className="fas fa-arrow-left"></i> Apprendre
        </button>
        <button
          className="btn next-btn"
          onClick={() => router.push(`/games/test-pronun?package=${packageId}`)}
        >
          <i className="fas fa-arrow-right"></i> Jeu suivant
        </button>
      </div>
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
