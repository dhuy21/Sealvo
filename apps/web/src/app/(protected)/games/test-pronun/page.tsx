'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useGameData, useSaveScore, useTrackLevelProgress, type GameWord } from '@/hooks/use-games';
import { useIsClient } from '@/hooks/use-is-client';
import api from '@/lib/api';
import confetti from 'canvas-confetti';

/* ================================================================
   TYPES
   ================================================================ */
interface SpeechRecognitionEvent {
  results: { [index: number]: { transcript: string; confidence: number }[] };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

/* ================================================================
   HELPERS
   ================================================================ */
function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function calculateLevenshteinSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;

  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) matrix[i] = [i];
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return 1 - matrix[len1][len2] / Math.max(len1, len2);
}

function getPhoneticVariants(word: string): string[] {
  const variants = [word];
  const rules: [RegExp, string][] = [
    [/ph/g, 'f'],
    [/ck$/g, 'k'],
    [/ll/g, 'l'],
    [/ss/g, 's'],
    [/tt/g, 't'],
    [/c([aou])/g, 'k$1'],
  ];

  for (const [pattern, replacement] of rules) {
    if (pattern.test(word)) {
      const variant = word.replace(pattern, replacement);
      if (variant !== word && !variants.includes(variant)) {
        variants.push(variant);
      }
    }
  }
  return variants;
}

function calculatePronunciationAccuracy(spoken: string, target: string, confidence: number): number {
  const normalizedSpoken = spoken.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const normalizedTarget = target.toLowerCase().replace(/[^\w\s]/g, '').trim();

  if (normalizedSpoken === normalizedTarget) {
    return Math.min(95 + confidence * 5, 100);
  }

  if (normalizedSpoken.includes(normalizedTarget) || normalizedTarget.includes(normalizedSpoken)) {
    return Math.round(Math.min(75 + confidence * 15, 85));
  }

  const similarity = calculateLevenshteinSimilarity(normalizedSpoken, normalizedTarget);

  if (similarity < 0.6) {
    return Math.max(10, Math.round(similarity * 30));
  }

  if (similarity >= 0.7) {
    const variants = getPhoneticVariants(normalizedTarget);
    for (const variant of variants) {
      if (normalizedSpoken === variant) {
        return Math.min(80 + confidence * 10, 90);
      }
    }
  }

  let baseAccuracy = similarity * 70;

  if (similarity >= 0.5 && normalizedSpoken.length > 2 && normalizedTarget.length > 2) {
    const startMatch = normalizedSpoken.substring(0, 2) === normalizedTarget.substring(0, 2);
    const endMatch = normalizedSpoken.slice(-2) === normalizedTarget.slice(-2);
    if (startMatch || endMatch) baseAccuracy += 5;
  }

  const lengthDifference = Math.abs(normalizedSpoken.length - normalizedTarget.length);
  const maxLength = Math.max(normalizedSpoken.length, normalizedTarget.length);
  if (1 - lengthDifference / maxLength < 0.7) baseAccuracy *= 0.7;

  let finalAccuracy = Math.min(baseAccuracy + confidence * 10, 75);

  if (normalizedSpoken.length > 0 && similarity >= 0.3) {
    finalAccuracy = Math.max(finalAccuracy, 15);
  } else {
    finalAccuracy = Math.max(finalAccuracy, 5);
  }

  return Math.round(finalAccuracy);
}

/* ================================================================
   CONFETTI
   ================================================================ */
function launchConfetti() {
  const duration = 15 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) return clearInterval(interval);

    const particleCount = 50 * (timeLeft / duration);
    confetti({ ...defaults, particleCount, origin: { x: Math.random() * 0.2 + 0.1, y: Math.random() - 0.2 } });
    confetti({ ...defaults, particleCount, origin: { x: Math.random() * 0.2 + 0.7, y: Math.random() - 0.2 } });
  }, 250);
}

/* ================================================================
   TTS
   ================================================================ */
async function playWordAudio(word: GameWord): Promise<void> {
  try {
    const response = await api.post('/tts/generate', {
      text: word.word,
      language: word.language_code || 'en-US',
    }, { responseType: 'blob' });

    const audioUrl = URL.createObjectURL(response.data);
    const audio = new Audio(audioUrl);
    audio.volume = 0.8;
    audio.onended = () => URL.revokeObjectURL(audioUrl);
    audio.onerror = () => URL.revokeObjectURL(audioUrl);
    await audio.play();
  } catch (err) {
    console.error('TTS error:', err);
  }
}

/* ================================================================
   INNER COMPONENT (needs useSearchParams)
   ================================================================ */
function TestPronunInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const packageId = searchParams.get('package') ? Number(searchParams.get('package')) : null;

  const { data: gameData } = useGameData('test_pronun', packageId);
  const saveScore = useSaveScore();
  const trackLevel = useTrackLevelProgress();

  // Game state
  type Screen = 'pre' | 'active' | 'post';
  const [screen, setScreen] = useState<Screen>('pre');
  const [words, setWords] = useState<GameWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedWords, setCompletedWords] = useState(0);
  const [totalAccuracy, setTotalAccuracy] = useState(0);
  const [perfectCount, setPerfectCount] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [recognizedText, setRecognizedText] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackType, setFeedbackType] = useState<'success' | 'info' | 'warning' | 'error' | 'neutral'>('neutral');
  const [isListening, setIsListening] = useState(false);
  const isClient = useIsClient();
  const speechSupported =
    isClient && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const [levelMessage, setLevelMessage] = useState('');
  const [levelStatus, setLevelStatus] = useState<'completed' | 'failed' | ''>('');

  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const recognitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const WORDS_PER_GAME = 10;
  const currentWord = words[currentIndex] ?? null;

  // Timer
  useEffect(() => {
    if (screen === 'active' && startTime > 0) {
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - startTime);
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [screen, startTime]);

  const processResult = useCallback(
    (spokenText: string, confidence: number) => {
      if (!currentWord) return;

      const target = currentWord.word.toLowerCase().trim();
      setRecognizedText(`"${spokenText}"`);

      const acc = calculatePronunciationAccuracy(spokenText, target, confidence);
      setAccuracy(acc);

      let message: string;
      let type: 'success' | 'info' | 'warning' | 'error' | 'neutral';
      let isPerfect = false;

      if (acc >= 90) {
        message = 'Excellent ! Prononciation parfaite !';
        type = 'success';
        isPerfect = true;
      } else if (acc >= 75) {
        message = 'Très bien ! Bonne prononciation !';
        type = 'success';
      } else if (acc >= 60) {
        message = 'Bien ! Prononciation correcte !';
        type = 'info';
      } else if (acc >= 40) {
        message = 'Pas mal ! Continuez à vous entraîner !';
        type = 'warning';
      } else if (acc >= 20) {
        message = 'Essayez encore ! Écoutez bien la prononciation.';
        type = 'warning';
      } else {
        message = 'Mot incorrect. Réessayez en écoutant attentivement.';
        type = 'error';
      }

      setFeedbackText(message);
      setFeedbackType(type);

      setTotalAccuracy((prev) => prev + acc);
      setCompletedWords((prev) => prev + 1);
      if (isPerfect) setPerfectCount((prev) => prev + 1);
    },
    [currentWord],
  );

  const startListening = useCallback(() => {
    if (!speechSupported || !currentWord) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Clean up previous
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = currentWord.language_code || 'en-US';
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      setFeedbackText('Écoute en cours... Parlez maintenant.');
      setFeedbackType('info');

      recognitionTimeoutRef.current = setTimeout(() => {
        try { recognition.stop(); } catch { /* ignore */ }
      }, 10000);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current);

      const results = event.results[0];
      if (results && results.length > 0) {
        const spokenText = results[0].transcript.toLowerCase().trim();
        const confidence = results[0].confidence || 0.5;
        processResult(spokenText, confidence);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current);
      setIsListening(false);

      const messages: Record<string, string> = {
        'no-speech': 'Aucune parole détectée. Parlez plus fort.',
        'audio-capture': "Impossible d'accéder au microphone.",
        'not-allowed': 'Permission microphone refusée.',
        'network': 'Erreur réseau.',
      };

      setFeedbackText(messages[event.error] || `Erreur: ${event.error}`);
      setFeedbackType('error');
    };

    recognition.onend = () => {
      if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current);
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (err) {
      console.error('Speech recognition start error:', err);
      setFeedbackText("Impossible de démarrer l'enregistrement.");
      setFeedbackType('error');
    }
  }, [speechSupported, currentWord, processResult]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
    if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current);
    setIsListening(false);
  }, []);

  function startGame() {
    if (!gameData || gameData.words.length === 0) return;

    const shuffled = [...gameData.words].sort(() => Math.random() - 0.5);
    setWords(shuffled);
    setCurrentIndex(0);
    setCompletedWords(0);
    setTotalAccuracy(0);
    setPerfectCount(0);
    setAccuracy(0);
    setRecognizedText('');
    setFeedbackText('');
    setFeedbackType('neutral');
    setLevelMessage('');
    setLevelStatus('');
    setStartTime(Date.now());
    setElapsed(0);
    setScreen('active');
  }

  function endGame() {
    clearInterval(timerRef.current);
    const finalTime = Date.now() - startTime;
    const avgAccuracy = completedWords > 0 ? totalAccuracy / completedWords : 0;
    const score = Math.round(avgAccuracy);

    saveScore.mutate({ game_type: 'test_pronun', score });

    const isSuccessful = avgAccuracy >= 70 && completedWords >= 5;
    trackLevel.mutate(
      { game_type: 'test_pronun', completed: isSuccessful, packageId: packageId! },
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

    setElapsed(finalTime);

    setTimeout(() => {
      setScreen('post');
      launchConfetti();
    }, 1000);
  }

  // Move to next word when completedWords changes
  useEffect(() => {
    if (screen !== 'active' || completedWords === 0) return;

    if (completedWords >= WORDS_PER_GAME) {
      const timeout = setTimeout(() => endGame(), 2000);
      return () => clearTimeout(timeout);
    }

    const timeout = setTimeout(() => {
      let nextIndex = Math.floor(Math.random() * words.length);
      while (nextIndex === currentIndex && words.length > 1) {
        nextIndex = Math.floor(Math.random() * words.length);
      }
      setCurrentIndex(nextIndex);
      setAccuracy(0);
      setRecognizedText('');
      setFeedbackText('');
      setFeedbackType('neutral');
    }, 2000);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedWords]);

  const avgAccuracy = completedWords > 0 ? Math.round(totalAccuracy / completedWords) : 0;

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
      {/* Sound Waves Background */}
      <div className="sound-waves">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="sound-wave" />
        ))}
      </div>

      {/* Audio Visualizer Background */}
      <div className="audio-visualizer">
        {Array.from({ length: 25 }, (_, i) => (
          <div key={i} className="visualizer-bar" />
        ))}
      </div>

      {/* Recording Waves */}
      <div className={`recording-waves ${isListening ? 'active' : ''}`}>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="recording-ring" />
        ))}
      </div>

      {/* Header */}
      <div className="game-header">
        <h1>
          <i className="fas fa-bolt" style={{ color: '#e9e919' }}></i>
          Test Prononciation
        </h1>
        <p className="game-description">Testez et améliorez votre prononciation</p>
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
                <h2>
                  <i className="fas fa-bolt" style={{ color: '#e9e919' }}></i>
                  Règles du jeu
                </h2>
                <ul className="rules-list">
                  <li>Écoutez attentivement la prononciation du mot</li>
                  <li>Cliquez sur le bouton microphone pour enregistrer votre prononciation</li>
                  <li>Utilisez le microphone pour bien prononcer</li>
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
                  <div className="words-display">
                    <span className="words-label">Mots complétés</span>
                    <span className="words-value">{completedWords}</span>
                  </div>
                  <div className="timer-display">
                    <span className="timer-label">Temps</span>
                    <span className="timer-value">{formatTime(elapsed)}</span>
                  </div>
                  <div className="accuracy-display">
                    <span className="accuracy-label">Précision</span>
                    <span className="accuracy-value">{accuracy}%</span>
                  </div>
                </div>

                <div className="game-board">
                  <div className={`word-display ${isListening ? 'speaking' : ''}`}>
                    <h2 className="current-word">{currentWord.word}</h2>
                    <p className="phonetic-text">{currentWord.pronunciation}</p>
                  </div>

                  <div className="pronunciation-controls">
                    <button
                      className="control-btn"
                      onClick={() => playWordAudio(currentWord)}
                    >
                      <i className="fas fa-play"></i> Écouter
                    </button>
                    <button
                      className={`control-btn ${isListening ? 'recording' : ''}`}
                      onClick={() => (isListening ? stopListening() : startListening())}
                      disabled={!speechSupported}
                    >
                      <i className={`fas ${isListening ? 'fa-stop' : 'fa-microphone'}`}></i>
                      {isListening ? 'Arrêter' : 'Enregistrer'}
                    </button>
                    <button
                      className="control-btn"
                      onClick={() => {
                        let nextIndex = Math.floor(Math.random() * words.length);
                        while (nextIndex === currentIndex && words.length > 1) {
                          nextIndex = Math.floor(Math.random() * words.length);
                        }
                        setCurrentIndex(nextIndex);
                        setAccuracy(0);
                        setRecognizedText('');
                        setFeedbackText('');
                      }}
                    >
                      <i className="fas fa-forward"></i> Passer
                    </button>
                  </div>

                  <div className="feedback-container">
                    <div className="accuracy-meter">
                      <div className="meter-fill" style={{ width: `${accuracy}%` }} />
                    </div>
                    {recognizedText && (
                      <div className="recognized-text">{recognizedText}</div>
                    )}
                    {feedbackText && (
                      <p className={`feedback-text feedback-${feedbackType}`}>{feedbackText}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* POST-GAME */}
            {screen === 'post' && (
              <div className="post-game-screen active">
                <div className="final-score-container">
                  <div className="final-score-label">Prononciations parfaites</div>
                  <span className="final-score">{perfectCount}</span>
                </div>

                <div className="game-summary">
                  <div className="summary-item">
                    <div className="summary-icon">⏳ Temps</div>
                    <span className="summary-value">{formatTime(elapsed)}</span>
                  </div>
                  <div className="summary-item">
                    <div className="summary-icon">🌞 Précision moyenne</div>
                    <span className="summary-value">{avgAccuracy}%</span>
                  </div>
                </div>

                {levelMessage && (
                  <div className={`track-level-message ${levelStatus ? `level-${levelStatus}` : ''}`}>
                    {levelMessage}
                  </div>
                )}

                <div className="action-buttons">
                  <button className="play-again-btn" onClick={startGame}>
                    <i className="fas fa-redo"></i> Réessayer
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
          onClick={() => router.push(`/games/word-scramble?package=${packageId}`)}
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
export default function TestPronunPage() {
  return (
    <Suspense>
      <TestPronunInner />
    </Suspense>
  );
}
