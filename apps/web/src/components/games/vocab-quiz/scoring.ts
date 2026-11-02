import { PASS_RULES, reachesShare } from '../level-progress';

/** +10 per selected option when right, −5 per selected option when wrong, never below 0. */
export function scoreAfterAnswer(score: number, correct: boolean, selectedCount: number): number {
  return correct ? score + 10 * selectedCount : Math.max(0, score - 5 * selectedCount);
}

export function isPassed(correctCount: number, questionCount: number): boolean {
  return reachesShare(correctCount, questionCount, PASS_RULES.vocab_quiz.minAccuracy);
}
