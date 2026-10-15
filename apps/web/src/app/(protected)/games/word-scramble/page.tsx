'use client';

import { Suspense, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useGameData, useSaveScore, useTrackLevelProgress, type GameWord } from '@/hooks/use-games';
import confetti from 'canvas-confetti';

/* ================================================================
   HELPERS
   ================================================================ */
function scrambleWord(word: string): string {
  const letters = word.split('');
  let scrambled: string;
  do {
    const shuffled = [...letters];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    scrambled = shuffled.join('');
  } while (scrambled === word && word.length > 1);
  return scrambled;
}

function launchConfetti() {
  const end = Date.now() + 15 * 1000;
  const colors = ['#a786ff', '#fd8bbc', '#eca184', '#f8deb1'];

  (function frame() {
    confetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

/* ================================================================
   INNER COMPONENT
   ================================================================ */
function WordScrambleInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const packageId = searchParams.get('package') ? Number(searchParams.get('package')) : null;

  const { data: gameData } = useGameData('word_scramble', packageId);
  const saveScore = useSaveScore();
  const trackLevel = useTrackLevelProgress();

  type Screen = 'pre' | 'active' | 'post';
  const [screen, setScreen] = useState<Screen>('pre');
  const [words, setWords] = useState<{ word: string; scrambled: string; meaning: string }[]>([]);
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
  const [levelStatus, setLevelStatus] = useState<'completed' | 'failed' | ''>('');

  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const currentWord = words[currentIndex] ?? null;

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

  // End game when timer hits 0
  useEffect(() => {
    if (screen === 'active' && timer === 0 && words.length > 0) {
      endGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer, screen]);

  function startGame() {
    if (scrambledWords.length === 0) return;

    const shuffled = [...scrambledWords].sort(() => Math.random() - 0.5);
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
    if (!currentWord || !input.trim()) return;

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
    setTotalAttempts((prev) => prev + 1);
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
      {/* Magical Background */}
      <div className="magical-background">
        {Array.from({ length: 14 }, (_, i) => (
          <div
            key={`orb-${i}`}
            className="magic-orb"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${40 + Math.random() * 80}px`,
              height: `${40 + Math.random() * 80}px`,
              opacity: 0.3 + Math.random() * 0.5,
              animationDuration: `${15 + Math.random() * 25}s`,
            }}
          />
        ))}
        {Array.from({ length: 15 }, (_, i) => (
          <div
            key={`star-${i}`}
            className="magic-star"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              fontSize: `${12 + Math.random() * 12}px`,
              opacity: 0.3 + Math.random() * 0.7,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${2 + Math.random() * 6}s`,
            }}
          >
            🌟
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="game-header">
        <h1>Word Scramble</h1>
        <p className="game-description">Retrouvez les mots mélangés</p>
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

      {/* Game Area */}
      {gameData && !gameData.errorMessage && (
        <div className="game-area">
          <div className="game-screen">
            {/* PRE-GAME */}
            {screen === 'pre' && (
              <div className="pre-game-screen active">
                <h2><i className="fas fa-bolt"></i> Règles du jeu</h2>
                <ul className="rules-list">
                  <li>Les lettres des mots ont été mélangées</li>
                  <li>Retrouvez les mots originaux en réorganisant les lettres</li>
                  <li>Obtenez 10 points pour chaque mot correct</li>
                  <li>Vous avez le temps de trouver le plus de mots possible</li>
                </ul>
                <button className="start-btn" onClick={startGame}>
                  <i className="fas fa-play"></i> Commencer
                </button>
              </div>
            )}

            {/* ACTIVE GAME */}
            {screen === 'active' && currentWord && (
              <div className="active-game-screen active">
                <div className="game-info">
                  <div className="score-display">
                    <span className="score-label">Score</span>
                    <span className="score-value">{score}</span>
                  </div>
                  <div className="timer-display">
                    <span className="timer-label">Temps</span>
                    <span className={`timer-value ${timer <= 30 ? 'warning' : ''}`}>{timer}</span>
                  </div>
                </div>

                <div className="scrambled-word-container">
                  <div className="scrambled-word">
                    {resultType ? currentWord.word : currentWord.scrambled}
                  </div>
                  <div className="word-meaning">{currentWord.meaning}</div>
                </div>

                <div className="answer-container">
                  <input
                    ref={inputRef}
                    type="text"
                    className="word-input"
                    placeholder="Votre réponse"
                    autoComplete="off"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') checkAnswer();
                    }}
                  />
                </div>

                <div className="button-group">
                  <button className="submit-btn" onClick={checkAnswer}>
                    <div className="back"></div>
                    <div className="front">
                      <i className="fa-solid fa-wand-magic-sparkles"></i>
                    </div>
                  </button>
                  <button
                    className="pass-btn"
                    onClick={goToNextWord}
                    disabled={!canSkip}
                  >
                    <div className="back"></div>
                    <div className="front">
                      <i className="fas fa-play"></i>
                    </div>
                  </button>
                </div>

                {resultMessage && (
                  <div className={`result-message ${resultType}`}>{resultMessage}</div>
                )}
              </div>
            )}

            {/* POST-GAME */}
            {screen === 'post' && (
              <div className="post-game-screen active">
                <div className="final-score-container">
                  <div className="final-score-label">Score final</div>
                  <span className="final-score">{score}</span>
                </div>

                <div className="game-summary">
                  <div className="summary-item">
                    <div className="summary-icon">🔍 Mots trouvés</div>
                    <span className="summary-value">{correctAnswers}</span>
                  </div>
                  <div className="summary-item">
                    <div className="summary-icon">📌 Précision</div>
                    <span className="summary-value">{finalAccuracy}%</span>
                  </div>
                </div>

                {levelMessage && (
                  <div className={`track-level-message ${levelStatus ? `level-${levelStatus}` : ''}`}>
                    {levelMessage}
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
      )}

      {/* Footer */}
      <div className="game-footer">
        <button
          className="btn learn-btn"
          onClick={() => router.push(`/learn?package=${packageId}`)}
        >
          <i className="fas fa-arrow-left"></i> Apprendre
        </button>
        <button
          className="btn next-btn"
          onClick={() => router.push(`/games/phrase-completion?package=${packageId}`)}
        >
          <i className="fas fa-arrow-right"></i> Jeu suivant
        </button>
      </div>
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
