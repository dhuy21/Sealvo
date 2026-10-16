'use client';

import { Suspense, useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useGameData, useSaveScore, useTrackLevelProgress, type GameWord } from '@/hooks/use-games';
import confetti from 'canvas-confetti';

/* ================================================================
   TYPES & HELPERS
   ================================================================ */
/** Randomized once per page load: decorations must not move on each timer re-render. */
const CELESTIAL_STYLES = Array.from({ length: 10 }, () => ({
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  animationDelay: `${Math.random() * 8}s`,
  animationDuration: `${6 + Math.random() * 4}s`,
}));

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
interface Phrase {
  phrase: string;
  word: string;
  meaningWord: string;
  correctWords: string[];
}

function generatePhrases(words: GameWord[]): Phrase[] {
  const phrases: Phrase[] = [];
  for (const w of words) {
    if (!w.example || !w.example.trim()) continue;

    let phrase = w.example;
    const regex = /\*\*([^*]+)\*\*/g;
    const correctWords = [...phrase.matchAll(regex)].map((m) => m[1]);
    phrase = phrase.replace(regex, '_____');

    if (correctWords.length > 0) {
      phrases.push({ phrase, word: w.word, meaningWord: w.meaning, correctWords });
    }
  }
  // Shuffle
  for (let i = phrases.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [phrases[i], phrases[j]] = [phrases[j], phrases[i]];
  }
  return phrases;
}

function launchConfetti() {
  const duration = 15 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = {
    spread: 360, ticks: 50, gravity: 0, decay: 0.94, startVelocity: 30,
    shapes: ['star' as const],
    colors: ['FFE400', 'FFBD00', 'E89400', 'FFCA6C', 'FDFFB8'],
  };

  const interval = setInterval(() => {
    if (Date.now() >= animationEnd) return clearInterval(interval);
    confetti({ ...defaults, particleCount: 40, scalar: 1.2 });
    confetti({ ...defaults, particleCount: 10, scalar: 0.75, shapes: ['circle'] });
  }, 2000);
}

/* ================================================================
   INNER COMPONENT
   ================================================================ */
function PhraseCompletionInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const packageId = searchParams.get('package') ? Number(searchParams.get('package')) : null;

  const { data: gameData } = useGameData('phrase_completion', packageId);
  const saveScore = useSaveScore();
  const trackLevel = useTrackLevelProgress();

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
  const [levelStatus, setLevelStatus] = useState<'completed' | 'failed' | ''>('');

  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const questionStartRef = useRef(0);
  const attemptsRef = useRef(0);
  const [totalQuestions, setTotalQuestions] = useState(0);

  const currentPhrase = phrases[currentIndex] ?? null;

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
    if (!gameData) return;

    const generated = generatePhrases(gameData.words);
    if (generated.length === 0) return;

    const availableWords = generated.length;
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
    setDisplayPhrase(escapeHtml(extendedPhrases[0].phrase));

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
        updated = updated.replace('_____', `<span class="blank correct">${escapeHtml(w)}</span>`);
      }
      setDisplayPhrase(updated);
    } else {
      setStreak(0);

      setFeedbackMessage(`Incorrect. La bonne réponse était "${currentPhrase.correctWords.join(' ')}"`);
      setFeedbackType('incorrect');

      let updated = escapeHtml(currentPhrase.phrase);
      for (const w of currentPhrase.correctWords) {
        updated = updated.replace('_____', `<span class="blank incorrect">${escapeHtml(w)}</span>`);
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
    setDisplayPhrase(escapeHtml(phrases[nextIdx]?.phrase ?? ''));
    questionStartRef.current = Date.now();
    attemptsRef.current = 0;

    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function endGame() {
    clearInterval(timerRef.current);
    const totalQ = totalQuestions;
    const accuracy = totalQ > 0 ? Math.round((correctAnswers / totalQ) * 100) : 0;
    const isSuccessful = accuracy >= 80;

    saveScore.mutate({ game_type: 'phrase_completion', score });

    trackLevel.mutate(
      { game_type: 'phrase_completion', completed: isSuccessful, packageId: packageId! },
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

  // End game when timer hits 0
  useEffect(() => {
    if (screen === 'active' && timer === 0 && phrases.length > 0) {
      endGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer, screen]);

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
    <div className="game-container enhanced-starry-mode">
      {/* Starry Focus Rings */}
      {Array.from({ length: 4 }, (_, i) => (
        <div key={`ring-${i}`} className="starry-focus-ring" style={{ animationDelay: `${i * 1.5}s` }} />
      ))}
      {/* Floating Celestial Elements */}
      {CELESTIAL_STYLES.map((style, i) => (
        <div key={`cel-${i}`} className="floating-celestial-element" style={style}>
          ⭐
        </div>
      ))}

      {/* Header */}
      <div className="game-header">
        <h1>Phrase Completion</h1>
        <p className="game-description">Complétez les phrases avec les mots appris</p>
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

      {/* Game screens */}
      {gameData && !gameData.errorMessage && (
        <>
          {/* PRE-GAME */}
          {screen === 'pre' && (
            <div className="screen pre-game-screen active">
              <h2><i className="fas fa-bolt" style={{ color: '#e9e919' }}></i> Règles du jeu</h2>
              <ul className="rules-list">
                <li>Complétez la phrase par les mots appris</li>
                <li>Obtenez 10 points pour chaque bonne réponse</li>
                <li>Bonus pour la rapidité et les séries</li>
                <li>Séparez les mots par le symbole ;</li>
              </ul>
              <button className="start-btn" onClick={startGame}>
                <i className="fas fa-play"></i> Commencer
              </button>
            </div>
          )}

          {/* ACTIVE GAME */}
          {screen === 'active' && currentPhrase && (
            <div className="screen active-game-screen active">
              <div className="game-info">
                <div className="score-display">
                  <div className="score-label">Score</div>
                  <span className="score-value">{score}</span>
                </div>
                <div className="progress-display">
                  <div className="progress-label">Question</div>
                  <span className="progress-value">
                    {currentIndex + (answered ? 1 : 0)}/{totalQuestions}
                  </span>
                </div>
                <div className="timer-display">
                  <div className="timer-label">Temps</div>
                  <span className={`timer-value ${timer <= 20 ? 'warning' : ''}`}>{timer}</span>
                </div>
              </div>

              <div className="phrase-container">
                <p
                  className="phrase-text"
                  dangerouslySetInnerHTML={{ __html: displayPhrase }}
                />

                <div className="input-container">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Tapez le mot manquant ici"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') checkAnswer(); }}
                    disabled={answered}
                  />
                </div>

                <div className="button-group">
                  <button className="submit-btn" onClick={checkAnswer} disabled={answered}>
                    <div className="back"></div>
                    <div className="front"><i className="fas fa-crown"></i></div>
                  </button>
                  <button
                    className="pass-btn"
                    onClick={goToNext}
                    disabled={!answered}
                  >
                    <div className="back"></div>
                    <div className="front">
                      {currentIndex + 1 >= totalQuestions
                        ? <i className="fa-solid fa-medal"></i>
                        : <i className="fas fa-play"></i>
                      }
                    </div>
                  </button>
                </div>

                {meaningText && <p className="word-meaning">{meaningText}</p>}
              </div>

              {feedbackMessage && (
                <div className="feedback-container">
                  <div className={`feedback-message ${feedbackType}`}>{feedbackMessage}</div>
                </div>
              )}
            </div>
          )}

          {/* POST-GAME */}
          {screen === 'post' && (
            <div className="screen post-game-screen active">
              <div className="final-score-container">
                <div className="final-score-label">Score final</div>
                <span className="final-score">{score}</span>
              </div>

              <div className="game-summary">
                <div className="summary-item">
                  <div className="summary-icon">👑 Corrects</div>
                  <span className="summary-value">{correctAnswers}/{totalQuestions}</span>
                </div>
                <div className="summary-item">
                  <div className="summary-icon">🧠 Série</div>
                  <span className="summary-value">{bestStreak}</span>
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
        </>
      )}

      {/* Footer */}
      <div className="game-footer">
        <button className="btn learn-btn" onClick={() => router.push(`/learn?package=${packageId}`)}>
          <i className="fas fa-arrow-left"></i> Apprendre
        </button>
        <button className="btn next-btn" onClick={() => router.push(`/games/speed-vocab?package=${packageId}`)}>
          <i className="fas fa-arrow-right"></i> Jeu suivant
        </button>
      </div>
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
