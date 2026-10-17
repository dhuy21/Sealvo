import { LEVELS } from '@sealvo/shared';
import type { ReviewWord } from './use-review-words';

export type VocabMode = 'today-words' | 'all-words';

/** Per-card state: -1 unseen, 0 à revoir, 2 appris. */
export type CardProgress = -1 | 0 | 2;

/** No checkbox exists for `v`: its words stay in the deck until a level checkbox is changed. */
export const INITIAL_LEVELS: ReadonlySet<string> = new Set(LEVELS);

/** Words matching both the level filter and the vocab mode, in the package order. */
export function buildDeck(
  words: ReviewWord[],
  levels: ReadonlySet<string>,
  vocabMode: VocabMode,
): ReviewWord[] {
  return words.filter((w) => levels.has(w.level) && (vocabMode === 'all-words' || w.dueToday));
}

export function freshProgress(length: number): CardProgress[] {
  return new Array<CardProgress>(length).fill(-1);
}
