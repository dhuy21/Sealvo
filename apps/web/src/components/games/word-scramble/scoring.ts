import { PASS_RULES, percentage } from '../level-progress';

export const POINTS_PER_WORD = 10;

/** Seconds for the whole game. */
export function timeLimit(wordCount: number): number {
  return 110 + wordCount * 9;
}

/** Correct answers over answers given, as a percentage. Never above 100. */
export function accuracy(correctAnswers: number, totalAttempts: number): number {
  return Math.min(100, percentage(correctAnswers, totalAttempts));
}

export function isPassed(accuracy: number): boolean {
  return accuracy >= PASS_RULES.word_scramble.minAccuracy;
}
