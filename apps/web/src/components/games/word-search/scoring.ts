import { PASS_RULES, percentage, reachesShare } from '../level-progress';

/** Words hidden in the grid, at most. */
export const MAX_WORDS = 30;

/** Points a hint costs; it needs at least that score. */
export const HINT_COST = 100;

const ALL_FOUND_BONUS = 100;

/** Seconds for the whole game. */
export function timeLimit(wordCount: number): number {
  return 300 + wordCount * 13;
}

/** Points of a found word: 5 per letter. */
export function foundWordPoints(letters: string): number {
  return letters.length * 5;
}

/** Score with the bonus for finding every word. */
export function finalScore(score: number, foundCount: number, wordCount: number): number {
  return score + (foundCount === wordCount ? ALL_FOUND_BONUS : 0);
}

/** Share of selections that found a word, as a percentage. */
export function selectionAccuracy(foundCount: number, wrongSelections: number): number {
  return percentage(foundCount, foundCount + wrongSelections);
}

export function isPassed(foundCount: number, wordCount: number): boolean {
  return reachesShare(foundCount, wordCount, PASS_RULES.word_search.minAccuracy);
}
