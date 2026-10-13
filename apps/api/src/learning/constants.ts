import type { learning_level } from '@prisma/client';

/**
 * Prisma enum learning_level uses: x, level_0, level_1, level_2, v
 * These map to DB values: x, 0, 1, 2, v
 */

/** Game → level mapping (which level each game belongs to) */
export const GAME_LEVEL: Record<string, learning_level> = {
  flash_match: 'x',
  vocab_quiz: 'x',
  test_pronun: 'x',
  word_scramble: 'level_0',
  phrase_completion: 'level_0',
  speed_vocab: 'level_1',
  word_search: 'level_2',
};

/** Required games per level (all must be completed to promote) */
export const LEVEL_GAMES: Record<string, string[]> = {
  x: ['flash_match', 'vocab_quiz', 'test_pronun'],
  level_0: ['word_scramble', 'phrase_completion'],
  level_1: ['speed_vocab'],
  level_2: ['word_search'],
};

/** Level promotion map */
export const NEXT_LEVEL: Record<string, learning_level> = {
  x: 'level_0',
  level_0: 'level_1',
  level_1: 'level_2',
  level_2: 'v',
};

/** Spaced repetition intervals (days) */
export const INTERVALS: Record<string, number> = {
  x: 0,
  level_0: 2,
  level_1: 4,
  level_2: 10,
  v: 20,
};
