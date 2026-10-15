'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useGameData, useSaveScore, useTrackLevelProgress } from '@/hooks/use-games';
import confetti from 'canvas-confetti';

/* ================================================================
   HELPERS
   ================================================================ */
function launchConfetti() {
  const duration = 15 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = {
    spread: 360, ticks: 100, gravity: 0, decay: 0.94, startVelocity: 30,
    shapes: ['circle' as const],
    colors: ['FF0000', 'FF7F00', 'FFFF00', 'FFA500', 'FF4500'],
  };

  const interval = setInterval(() => {
    if (Date.now() >= animationEnd) return clearInterval(interval);
    confetti({ ...defaults, particleCount: 50, scalar: 2 });
    confetti({ ...defaults, particleCount: 25, scalar: 2 });
  }, 600);
}

/* ================================================================
   INNER COMPONENT
   ================================================================ */
function SpeedVocabInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const packageId = searchParams.get('package') ? Number(searchParams.get('package')) : null;

  const { data: gameData } = useGameData('speed_vocab', packageId);
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
  const [levelStatus, setLevelStatus] = useState<'completed' | 'failed' | ''>('');

  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const currentWord = words[currentIndex] ?? null;

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

  // End game when timer hits 0
  useEffect(() => {
    if (screen === 'active' && timer === 0 && words.length > 0) {
      endGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer, screen]);

  function startGame() {
    if (!gameData || gameData.words.length === 0) return;

    const prepared = gameData.words.map((w) => ({ word: w.word, meaning: w.meaning }));
    const shuffled = [...prepared].sort(() => Math.random() - 0.5);
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
        onSuccess: (data: { level_completed?: boolean; words_updated?: number; to_level?: string }) => {
          if (data.level_completed && data.words_updated && data.words_updated > 0) {
            setLevelMessage(`Niveau terminé! ${data.words_updated} mots sont passés au niveau ${data.to_level}`);
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
      launchConfetti();
    }, 1000);
  }

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

      {/* Error */}
      {gameData?.errorMessage && (
        <div className="error-box">
          <i className="fas fa-exclamation-triangle"></i>
          <p>{gameData.errorMessage}</p>
        </div>
      )}

      {/* Stats */}
      {gameData && !gameData.errorMessage && (
        <div className="game-stats">
          <div className="stat-box">
            <span className="stat-label">Mots disponibles</span>
            <span className="stat-value">{gameData.wordCount}</span>
          </div>
        </div>
      )}

      {gameData && !gameData.errorMessage && (
        <div className="game-area">
          <div className="game-screen">
            {/* PRE-GAME */}
            {screen === 'pre' && (
              <div className="pre-game-screen active">
                <h2><i className="fas fa-bolt"></i> Règles du jeu</h2>
                <ul className="rules-list">
                  <li>Un mot et sa signification s&apos;affichent</li>
                  <li>Tapez le mot le plus vite possible</li>
                  <li>10 points par mot + bonus de longueur et série</li>
                  <li>Le temps est limité !</li>
                </ul>
                <button className="start-btn" onClick={startGame}>
                  <i className="fas fa-play"></i> Commencer
                </button>
              </div>
            )}

            {/* ACTIVE GAME */}
            {screen === 'active' && currentWord && (
              <div className="active-game-screen active game-active">
                <div className="game-info">
                  <div className="score-display">
                    <span className="score-label">Score</span>
                    <span id="score" className="score-value">{score}</span>
                  </div>
                  <div className="streak-display">
                    <span className="streak-label">Série</span>
                    <span id="streak" className="streak-value">{streak}</span>
                  </div>
                  <div className="timer-display">
                    <span className="timer-label">Temps</span>
                    <span id="timer" className={`timer-value ${timer <= 50 ? 'warning' : ''}`}>{timer}</span>
                  </div>
                </div>

                <div className="word-container">
                  <div id="word-display" className="word-display">{currentWord.word}</div>
                  <div id="meaning-display" className="meaning-display">{currentWord.meaning}</div>
                </div>

                <div className="input-container">
                  <input
                    ref={inputRef}
                    id="word-input"
                    type="text"
                    className={`word-input ${inputFeedback}`}
                    placeholder="Tapez le mot ici..."
                    autoComplete="off"
                    value={input}
                    onChange={(e) => handleInput(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* POST-GAME */}
            {screen === 'post' && (
              <div className="post-game-screen active">
                <div className="final-score-container">
                  <div className="final-score-label">Score final</div>
                  <span id="final-score" className="final-score">{score}</span>
                </div>

                <div className="game-summary">
                  <div className="summary-item">
                    <div className="summary-icon">🔥 Meilleure série</div>
                    <span id="best-streak" className="summary-value">{bestStreak}</span>
                  </div>
                  <div className="summary-item">
                    <div className="summary-icon">⚡ Mots/min</div>
                    <span id="wpm" className="summary-value">{wpm}</span>
                  </div>
                </div>

                {levelMessage && (
                  <div className={`track-level-message ${levelStatus ? `level-${levelStatus}` : ''}`}>
                    {levelMessage}
                  </div>
                )}

                <div id="play-again-container" className="action-buttons">
                  <button id="play-again" className="play-again-btn" onClick={startGame}>
                    <i className="fas fa-redo"></i> Rejouer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="game-footer">
        <button className="btn learn-btn" onClick={() => router.push(`/learn?package=${packageId}`)}>
          <i className="fas fa-arrow-left"></i> Apprendre
        </button>
        <button className="btn next-btn" onClick={() => router.push(`/games/word-search?package=${packageId}`)}>
          <i className="fas fa-arrow-right"></i> Jeu suivant
        </button>
      </div>
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
