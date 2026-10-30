import { PASS_RULES, percentage } from '../level-progress';

/** Seconds for the whole game. */
export function timeLimit(wordCount: number): number {
  return 100 + wordCount * 6;
}

/** Points of a correctly typed word: 10, 1 per letter beyond 4, 5 per 3-word streak. */
export function wordPoints(word: string, streak: number): number {
  return 10 + Math.max(0, word.length - 4) + Math.floor(streak / 3) * 5;
}

/** A wrong word costs 5 points and the score stays at 0 or above. */
export function scoreAfterMiss(score: number): number {
  return Math.max(0, score - 5);
}

/** Correct words over the full round, which always runs until the timer ends. */
export function wordsPerMinute(correctWords: number, seconds: number): number {
  if (seconds <= 0) return 0;
  return Math.round((correctWords * 60) / seconds);
}

/** Accuracy over the words typed, wrong ones included. */
export function isPassed(correctWords: number, wordsTyped: number): boolean {
  return percentage(correctWords, wordsTyped) >= PASS_RULES.speed_vocab.minAccuracy;
}
