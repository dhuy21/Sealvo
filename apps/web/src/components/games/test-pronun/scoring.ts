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

/** From this accuracy a word counts as perfectly pronounced */
export const PERFECT_ACCURACY = 90;

const FEEDBACK: [minAccuracy: number, message: string][] = [
  [PERFECT_ACCURACY, 'Excellent ! Prononciation parfaite !'],
  [75, 'Très bien ! Bonne prononciation !'],
  [60, 'Bien ! Prononciation correcte !'],
  [40, 'Pas mal ! Continuez à vous entraîner !'],
  [20, 'Essayez encore ! Écoutez bien la prononciation.'],
];

/** The message shown after a word, by its accuracy */
export function accuracyFeedback(accuracy: number): string {
  return (
    FEEDBACK.find(([min]) => accuracy >= min)?.[1] ??
    'Mot incorrect. Réessayez en écoutant attentivement.'
  );
}
