'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGameData, useSaveScore, type GameWord } from '@/hooks/use-games';
import { useTimeouts } from '@/hooks/use-timeouts';
import { useUnmountSignal } from '@/hooks/use-unmount-signal';
import { shuffleArray } from '@/lib/shuffle';
import { launchFireworks } from '@/components/games/confetti';
import { useCelebration } from '@/components/games/use-celebration';
import { useLevelTracking } from '@/components/games/use-level-tracking';
import { GameDataStatus } from '@/components/games/GameDataStatus';
import { GameStats } from '@/components/games/GameStats';
import { GameFooter } from '@/components/games/GameFooter';
import type { LevelStatus } from '@/components/games/TrackLevelMessage';
import { useTransientFlag } from '@/components/games/use-transient-flag';
import { calculatePronunciationAccuracy, playWordAudio } from '@/components/games/test-pronun/pronunciation';
import { useFeedback } from '@/components/games/test-pronun/use-feedback';
import { useSpeechRecognition } from '@/components/games/test-pronun/use-speech-recognition';
import { SoundBackground } from '@/components/games/test-pronun/SoundBackground';
import { TestPronunRules } from '@/components/games/test-pronun/TestPronunRules';
import { PronunciationBoard } from '@/components/games/test-pronun/PronunciationBoard';
import { TestPronunSummary } from '@/components/games/test-pronun/TestPronunSummary';
import { cx } from '@/lib/css-module';
import styles from '@/styles/games/test-pronun.module.css';

/* ================================================================
   INNER COMPONENT (needs useSearchParams)
   ================================================================ */
function TestPronunInner() {
  const searchParams = useSearchParams();
  const packageId = searchParams.get('package') ? Number(searchParams.get('package')) : null;

  const { data: gameData, isLoading, error } = useGameData('test_pronun', packageId);
  const saveScore = useSaveScore();
  const level = useLevelTracking('test_pronun');

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
  const [meterWidth, setMeterWidth] = useState(0);
  const [recognizedText, setRecognizedText] = useState('');
  const { feedback, setFeedback, getFeedbackText } = useFeedback();
  const [speaking, triggerSpeaking] = useTransientFlag();
  const [wordFadeIn, triggerWordFadeIn] = useTransientFlag();
  const [levelMessage, setLevelMessage] = useState('');
  const [levelStatus, setLevelStatus] = useState<LevelStatus>('');

  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const later = useTimeouts();
  const celebrate = useCelebration(launchFireworks);
  const unmountSignal = useUnmountSignal();

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

  function processResult(spokenText: string, confidence: number) {
    if (!currentWord) return;

    const target = currentWord.word.toLowerCase().trim();
    setRecognizedText(`"${spokenText}"`);

    const acc = calculatePronunciationAccuracy(spokenText, target, confidence);
    setAccuracy(acc);
    setMeterWidth(acc);

    let message: string;
    if (acc >= 90) {
      message = 'Excellent ! Prononciation parfaite !';
      setPerfectCount((prev) => prev + 1);
    } else if (acc >= 75) {
      message = 'Très bien ! Bonne prononciation !';
    } else if (acc >= 60) {
      message = 'Bien ! Prononciation correcte !';
    } else if (acc >= 40) {
      message = 'Pas mal ! Continuez à vous entraîner !';
    } else if (acc >= 20) {
      message = 'Essayez encore ! Écoutez bien la prononciation.';
    } else {
      message = 'Mot incorrect. Réessayez en écoutant attentivement.';
    }
    setFeedback(message);

    setTotalAccuracy((prev) => prev + acc);
    setCompletedWords((prev) => prev + 1);
  }

  const speech = useSpeechRecognition({
    language: currentWord?.language_code || 'en-US',
    onResult: processResult,
    onListenStart: () => setRecognizedText(''),
    setFeedback,
    getFeedbackText,
  });

  function showWord(index: number) {
    setCurrentIndex(index);
    setMeterWidth(0);
    setRecognizedText('');
    setFeedback('');
    triggerWordFadeIn(500);
  }

  function startGame() {
    if (!gameData || gameData.errorMessage || gameData.words.length === 0) {
      setScreen('pre');
      return;
    }

    const shuffled = shuffleArray(gameData.words);
    setWords(shuffled);
    setCompletedWords(0);
    setTotalAccuracy(0);
    setPerfectCount(0);
    setAccuracy(0);
    setLevelMessage('');
    setLevelStatus('');
    setStartTime(Date.now());
    setElapsed(0);
    setScreen('active');
    showWord(Math.floor(Math.random() * shuffled.length));
  }

  function playCurrentWord() {
    if (!currentWord) return;
    triggerSpeaking(2000);
    void playWordAudio(currentWord, setFeedback, unmountSignal());
  }

  function skipWord() {
    showWord(Math.floor(Math.random() * words.length));
  }

  function endGame() {
    clearInterval(timerRef.current);
    const finalTime = Date.now() - startTime;
    const avgAccuracy = completedWords > 0 ? totalAccuracy / completedWords : 0;
    const score = Math.round(avgAccuracy);

    saveScore.mutate({ game_type: 'test_pronun', score });

    const isSuccessful = avgAccuracy >= 70 && completedWords >= 5;
    level.track(isSuccessful, packageId!);

    if (isSuccessful) {
      setLevelMessage('Excellent travail ! Progressez les autres jeux de ce niveau 😍');
      setLevelStatus('completed');
    } else {
      setLevelMessage('Bon courage ! Réessayer ce jeu pour améliorer vos compétences 🤧');
      setLevelStatus('failed');
    }

    setElapsed(finalTime);

    later(() => {
      setScreen('post');
      celebrate();
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
      showWord(nextIndex);
    }, 2000);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedWords]);

  const avgAccuracy = completedWords > 0 ? Math.round(totalAccuracy / completedWords) : 0;

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
    <div className={cx(styles, 'game-container')}>
      <SoundBackground
        mode={speech.isListening ? 'listening' : speech.hasListened ? 'normal' : 'idle'}
      />

      {/* Header */}
      <div className={cx(styles, 'game-header')}>
        <h1>
          <i className="fas fa-bolt" style={{ color: '#e9e919' }}></i>
          Défi Prononcial
        </h1>
        <p className={cx(styles, 'game-description')}>Testez et améliorez votre prononciation</p>
      </div>

      {screen === 'pre' && (
        <GameDataStatus isLoading={isLoading} error={error} data={gameData} packageId={packageId} styles={styles} />
      )}

      {gameData && (screen !== 'pre' || ready) && (
        <>
          <GameStats gameType="test_pronun" wordCount={gameData.wordCount} styles={styles} />

          <div className={cx(styles, 'game-area')}>
            <div className={cx(styles, 'game-screen')}>
              {screen === 'pre' && <TestPronunRules onStart={startGame} />}

              {screen === 'active' && currentWord && (
                <PronunciationBoard
                  currentWord={currentWord}
                  completedWords={completedWords}
                  elapsed={elapsed}
                  accuracy={accuracy}
                  meterWidth={meterWidth}
                  speaking={speaking}
                  wordFadeIn={wordFadeIn}
                  isListening={speech.isListening}
                  speechSupported={speech.supported}
                  recognizedText={recognizedText}
                  feedback={feedback}
                  onPlay={playCurrentWord}
                  onToggleRecording={speech.toggle}
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
                  levelFinished={level.levelFinished}
                  packageId={packageId}
                  onReplay={startGame}
                />
              )}
            </div>
          </div>
        </>
      )}

      <GameFooter packageId={packageId} nextGame="word-scramble" styles={styles} />
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
