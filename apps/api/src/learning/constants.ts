import type { learning_level } from '@prisma/client';
import {
  GAME_LEVEL as SHARED_GAME_LEVEL,
  LEVEL_GAMES as SHARED_LEVEL_GAMES,
  LEVEL_INTERVALS,
} from '@sealvo/shared';

/**
 * Prisma enum learning_level uses: x, level_0, level_1, level_2, v
 * These map to DB values: x, 0, 1, 2, v
 *
 * Indexed by unvalidated strings (route params, Redis fields), hence `Record<string, …>`.
 */

/** Game → level mapping (which level each game belongs to) */
export const GAME_LEVEL: Record<string, learning_level> = SHARED_GAME_LEVEL;

/** Required games per level (all must be completed to promote) */
export const LEVEL_GAMES: Record<string, readonly string[]> = SHARED_LEVEL_GAMES;

/** Level promotion map */
export const NEXT_LEVEL: Record<string, learning_level> = {
  x: 'level_0',
  level_0: 'level_1',
  level_1: 'level_2',
  level_2: 'v',
};

/** Spaced repetition intervals (days) */
export const INTERVALS: Record<string, number> = LEVEL_INTERVALS;
