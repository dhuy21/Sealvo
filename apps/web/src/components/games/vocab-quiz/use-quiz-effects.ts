import { useState } from 'react';
import { useTransientFlag } from '@/components/games/use-transient-flag';
import { useTimeouts } from '@/hooks/use-timeouts';
import {
  createGentleWaveEffect,
  createLovelyParticles,
  playErrorSound,
  playSuccessSound,
} from './quiz-effects';

/** CSS animation flags and one-shot effects of the quiz screen. */
export function useQuizEffects() {
  /** `enhanced-quiz-mode` on the container: from page load until the quiz ends, again on replay. */
  const [enhancedMode, setEnhancedMode] = useState(true);
  const [quizActive, setQuizActive] = useState(false);
  const [questionLoading, triggerQuestionLoading] = useTransientFlag();
  const [revealing, triggerRevealing] = useTransientFlag();
  const [progressUpdating, triggerProgressUpdating] = useTransientFlag();
  const [scoreIncrease, triggerScoreIncrease] = useTransientFlag();
  const [completionGlow, triggerCompletionGlow] = useTransientFlag();
  // Leaving the page right after the quiz must not add particles to the next one
  const later = useTimeouts();

  const start = () => {
    setEnhancedMode(true);
    setQuizActive(true);
  };

  const showQuestion = () => {
    triggerQuestionLoading(1800);
    triggerRevealing(1200);
    triggerProgressUpdating(800);
  };

  const answer = (isCorrect: boolean) => {
    if (isCorrect) playSuccessSound();
    else playErrorSound();
    createLovelyParticles(isCorrect);
    createGentleWaveEffect(isCorrect);
    if (isCorrect) triggerScoreIncrease(1000);
  };

  const finish = (passed: boolean) => {
    setQuizActive(false);
    setEnhancedMode(false);
    if (passed) {
      triggerCompletionGlow(3000);
      for (let i = 0; i < 3; i++) later(() => createLovelyParticles(true), i * 300);
    }
  };

  return {
    enhancedMode,
    screenFlags: {
      quizActive,
      questionLoading,
      revealing,
      progressUpdating,
      scoreIncrease,
      completionGlow,
    },
    start,
    showQuestion,
    answer,
    finish,
  };
}

export type QuizScreenFlags = ReturnType<typeof useQuizEffects>['screenFlags'];
