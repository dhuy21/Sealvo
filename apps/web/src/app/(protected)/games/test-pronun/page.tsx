'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import type { GameWord } from '@/hooks/use-games';
import { randomIndexExcept, shuffleArray } from '@/lib/shuffle';
import { launchFireworks } from '@/components/games/confetti';
import { useGameShell } from '@/components/games/use-game-shell';
import { GameDataStatus } from '@/components/games/GameDataStatus';
import { GameStats } from '@/components/games/GameStats';
import { GameFooter } from '@/components/games/GameFooter';
import { useTransientFlag } from '@/components/games/use-transient-flag';
import {
  calculatePronunciationAccuracy,
  playWordAudio,
} from '@/components/games/test-pronun/pronunciation';
import { useFeedback } from '@/components/games/test-pronun/use-feedback';
import { useSpeechRecognition } from '@/components/games/test-pronun/use-speech-recognition';
import { SoundBackground } from '@/components/games/test-pronun/SoundBackground';
import { TestPronunRules } from '@/components/games/test-pronun/TestPronunRules';
import { PronunciationBoard } from '@/components/games/test-pronun/PronunciationBoard';
import { TestPronunSummary } from '@/components/games/test-pronun/TestPronunSummary';
import {
  PERFECT_ACCURACY,
  WORDS_PER_GAME,
  accuracyFeedback,
  averageAccuracy,
  isPassed,
} from '@/components/games/test-pronun/scoring';
import { cx } from '@/lib/css-module';
import styles from '@/styles/games/test-pronun.module.css';

function TestPronunInner() {
  const shell = useGameShell('test_pronun', { celebration: launchFireworks });
  const { packageId, gameData, screen } = shell;

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

  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const playbackRef = useRef<AbortController | null>(null);
  /** The word being recorded: a result arriving after a skip or the end must not be scored */
  const recordedWordRef = useRef<GameWord | null>(null);
  /** The shown word got its score: recording it again until the next word changes nothing */
  const scoredRef = useRef(false);
  /** Next word (or the end), 2 s after a score */
  const advanceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const currentWord = words[currentIndex] ?? null;

  useEffect(() => () => playbackRef.current?.abort(), []);

  useEffect(() => {
    if (screen === 'active' && startTime > 0) {
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - startTime);
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [screen, startTime]);

  function processResult(spokenText: string, confidence: number) {
    if (!currentWord || screen !== 'active' || recordedWordRef.current !== currentWord) return;
    if (scoredRef.current) return;
    scoredRef.current = true;

    const target = currentWord.word.toLowerCase().trim();
    setRecognizedText(`"${spokenText}"`);

    const acc = calculatePronunciationAccuracy(spokenText, target, confidence);
    setAccuracy(acc);
    setMeterWidth(acc);

    if (acc >= PERFECT_ACCURACY) setPerfectCount((prev) => prev + 1);
    setFeedback(accuracyFeedback(acc));

    setTotalAccuracy((prev) => prev + acc);
    setCompletedWords((prev) => prev + 1);
  }

  const speech = useSpeechRecognition({
    language: currentWord?.language_code || 'en-US',
    onResult: processResult,
    onListenStart: () => {
      recordedWordRef.current = currentWord;
      setRecognizedText('');
    },
    setFeedback,
    getFeedbackText,
  });

  /** Stops the word being played, so a replay or the next word never overlaps it. */
  function stopPlayback() {
    playbackRef.current?.abort();
    playbackRef.current = null;
  }

  function showWord(index: number) {
    stopPlayback();
    recordedWordRef.current = null;
    speech.cancelListen();
    scoredRef.current = false;
    setCurrentIndex(index);
    setMeterWidth(0);
    setRecognizedText('');
    setFeedback('');
    triggerWordFadeIn(500);
  }

  function startGame() {
    if (!gameData || gameData.errorMessage || gameData.words.length === 0) {
      shell.showRules();
      return;
    }

    const shuffled = shuffleArray(gameData.words);
    setWords(shuffled);
    setCompletedWords(0);
    setTotalAccuracy(0);
    setPerfectCount(0);
    setAccuracy(0);
    setStartTime(Date.now());
    setElapsed(0);
    shell.start();
    showWord(Math.floor(Math.random() * shuffled.length));
  }

  function playCurrentWord() {
    if (!currentWord) return;
    triggerSpeaking(2000);
    stopPlayback();
    const playback = new AbortController();
    playbackRef.current = playback;
    void playWordAudio(currentWord, setFeedback, playback.signal);
  }

  function skipWord() {
    // A scored word already has its move scheduled: skipping replaces it instead of adding one
    clearTimeout(advanceRef.current);
    if (completedWords >= WORDS_PER_GAME) return endGame();
    showWord(Math.floor(Math.random() * words.length));
  }

  function endGame() {
    const avgAccuracy = Math.round(averageAccuracy(totalAccuracy, completedWords));
    if (!shell.finish(avgAccuracy, isPassed(avgAccuracy, completedWords))) return;
    clearInterval(timerRef.current);
    setElapsed(Date.now() - startTime);
  }

  useEffect(() => {
    if (screen !== 'active' || completedWords === 0) return;

    advanceRef.current = setTimeout(
      completedWords >= WORDS_PER_GAME
        ? endGame
        : () => showWord(randomIndexExcept(words.length, currentIndex)),
      2000,
    );
    return () => clearTimeout(advanceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedWords]);

  const avgAccuracy = Math.round(averageAccuracy(totalAccuracy, completedWords));

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

      <div className={cx(styles, 'game-header')}>
        <h1>
          <i className="fas fa-bolt" style={{ color: '#e9e919' }}></i>
          Défi Prononcial
        </h1>
        <p className={cx(styles, 'game-description')}>Testez et améliorez votre prononciation</p>
      </div>

      {screen === 'pre' && (
        <GameDataStatus
          isLoading={shell.isLoading}
          error={shell.error}
          data={gameData}
          packageId={packageId}
          styles={styles}
        />
      )}

      {gameData && (screen !== 'pre' || shell.ready) && (
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

      <GameFooter packageId={packageId} nextGame="word-scramble" styles={styles} />
    </div>
  );
}

export default function TestPronunPage() {
  return (
    <Suspense>
      <TestPronunInner />
    </Suspense>
  );
}
