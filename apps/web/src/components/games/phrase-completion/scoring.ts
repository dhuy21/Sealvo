import { PASS_RULES, percentage } from '../level-progress';

/** Every word once (at most 100), plus half as many again. */
export function questionCount(wordCount: number): number {
  return Math.min(wordCount, 100) + Math.floor(0.5 * wordCount);
}

/** Seconds for the whole game. */
export function timeLimit(questionCount: number): number {
  return 200 + 4 * questionCount;
}

/** Points of a correct answer: 10, up to 5 for speed, 5 per 3-answer streak, minus 2 per extra attempt. */
export function answerPoints(questionSeconds: number, streak: number, attempts: number): number {
  const timeBonus = Math.max(0, Math.min(5, Math.round(10 - questionSeconds)));
  const streakBonus = Math.floor(streak / 3) * 5;
  const attemptsPenalty = Math.max(0, attempts - 1) * 2;
  return 10 + timeBonus + streakBonus - attemptsPenalty;
}

/** Accuracy over all questions, unanswered ones included. */
export function isPassed(correctAnswers: number, totalQuestions: number): boolean {
  return percentage(correctAnswers, totalQuestions) >= PASS_RULES.phrase_completion.minAccuracy;
}
