import { PASS_RULES } from '../level-progress';

export const WORDS_PER_GAME = 10;

/** Mean accuracy of the pronounced words; 0 before the first one. */
export function averageAccuracy(totalAccuracy: number, completedWords: number): number {
  return completedWords > 0 ? totalAccuracy / completedWords : 0;
}

export function isPassed(averageAccuracy: number, completedWords: number): boolean {
  const { minAccuracy, minWords } = PASS_RULES.test_pronun;
  return averageAccuracy >= minAccuracy && completedWords >= minWords;
}
