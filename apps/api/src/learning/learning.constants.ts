import { LEVELS, type Level } from '@sealvo/shared';

/** Level promotion map: each level to the next one in LEVELS (`v` is final) */
export const NEXT_LEVEL = Object.fromEntries(
  LEVELS.slice(0, -1).map((level, i) => [level, LEVELS[i + 1]]),
) as Record<Exclude<Level, 'v'>, Level>;
