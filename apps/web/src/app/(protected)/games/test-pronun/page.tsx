'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGameData, useSaveScore, useTrackLevelProgress, type GameWord } from '@/hooks/use-games';
import { useIsClient } from '@/hooks/use-is-client';
import { shuffleArray } from '@/lib/shuffle';
import { launchFireworks } from '@/components/games/confetti';
import { levelCompletedMessage } from '@/components/games/level-progress';
import { GameDataStatus } from '@/components/games/GameDataStatus';
import { GameStats } from '@/components/games/GameStats';
import { GameFooter } from '@/components/games/GameFooter';
import type { LevelStatus } from '@/components/games/TrackLevelMessage';
import type {
  SpeechRecognitionErrorEvent,
  SpeechRecognitionEvent,
  SpeechRecognitionInstance,
} from '@/components/games/test-pronun/speech-recognition';
import { calculatePronunciationAccuracy } from '@/components/games/test-pronun/pronunciation';
import { SoundBackground } from '@/components/games/test-pronun/SoundBackground';
import { TestPronunRules } from '@/components/games/test-pronun/TestPronunRules';
import { PronunciationBoard, type FeedbackType } from '@/components/games/test-pronun/PronunciationBoard';
import { TestPronunSummary } from '@/components/games/test-pronun/TestPronunSummary';

/* ================================================================
   INNER COMPONENT (needs useSearchParams)
   ================================================================ */
function TestPronunInner() {
  const searchParams = useSearchParams();
  const packageId = searchParams.get('package') ? Number(searchParams.get('package')) : null;

  const { data: gameData, isLoading, error } = useGameData('test_pronun', packageId);
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
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('neutral');
  const [isListening, setIsListening] = useState(false);
  const isClient = useIsClient();
  const speechSupported =
    isClient && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const [levelMessage, setLevelMessage] = useState('');
  const [levelStatus, setLevelStatus] = useState<LevelStatus>('');

  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const recognitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const WORDS_PER_GAME = 10;
  const currentWord = words[currentIndex] ?? null;
  const ready = !!gameData && !gameData.errorMessage;

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
      let type: FeedbackType;
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
    if (!gameData || gameData.errorMessage || gameData.words.length === 0) {
      setScreen('pre');
      return;
    }

    const shuffled = shuffleArray(gameData.words);
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

  function skipWord() {
    let nextIndex = Math.floor(Math.random() * words.length);
    while (nextIndex === currentIndex && words.length > 1) {
      nextIndex = Math.floor(Math.random() * words.length);
    }
    setCurrentIndex(nextIndex);
    setAccuracy(0);
    setRecognizedText('');
    setFeedbackText('');
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
        onSuccess: (data) => {
          const message = levelCompletedMessage(data);
          if (message) {
            setLevelMessage(message);
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
      launchFireworks();
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
      <SoundBackground isListening={isListening} />

      {/* Header */}
      <div className="game-header">
        <h1>
          <i className="fas fa-bolt" style={{ color: '#e9e919' }}></i>
          Test Prononciation
        </h1>
        <p className="game-description">Testez et améliorez votre prononciation</p>
      </div>

      {screen === 'pre' && (
        <GameDataStatus isLoading={isLoading} error={error} data={gameData} packageId={packageId} />
      )}

      {gameData && (screen !== 'pre' || ready) && (
        <>
          <GameStats wordCount={gameData.wordCount} />

          <div className="game-area">
            <div className="game-screen">
              {screen === 'pre' && <TestPronunRules onStart={startGame} />}

              {screen === 'active' && currentWord && (
                <PronunciationBoard
                  currentWord={currentWord}
                  completedWords={completedWords}
                  elapsed={elapsed}
                  accuracy={accuracy}
                  isListening={isListening}
                  speechSupported={speechSupported}
                  recognizedText={recognizedText}
                  feedbackText={feedbackText}
                  feedbackType={feedbackType}
                  onStartListening={startListening}
                  onStopListening={stopListening}
                  onSkip={skipWord}
                />
              )}

              {screen === 'post' && (
                <TestPronunSummary
                  perfectCount={perfectCount}
                  elapsed={elapsed}
                  avgAccuracy={avgAccuracy}
                  levelMessage={levelMessage}
                  levelStatus={levelStatus}
                  onReplay={startGame}
                />
              )}
            </div>
          </div>
        </>
      )}

      <GameFooter packageId={packageId} nextGame="word-scramble" />
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
