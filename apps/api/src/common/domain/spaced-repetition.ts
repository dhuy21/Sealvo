import type { Prisma } from '@prisma/client';
import { LEVEL_INTERVALS, LEVELS, type Level } from '@sealvo/shared';

/** Midnight of the current day in server time (the API image sets TZ=Europe/Paris). */
export function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * A word at `level` is due when `date_memorized < dueCutoff(level)`.
 * Same rule as the old SQL: DATE(date_memorized) + INTERVAL n DAY <= CURDATE().
 */
export function dueCutoff(level: Level, today = startOfToday()): Date {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + 1 - LEVEL_INTERVALS[level]);
  return cutoff;
}

/** A null `date_memorized` is never due (the old SQL comparison with NULL was never true). */
export function isDue(level: Level, dateMemorized: Date | null, today = startOfToday()): boolean {
  return dateMemorized !== null && dateMemorized < dueCutoff(level, today);
}

/** Prisma `OR` clause matching every learning row that is due today, across all levels. */
export function dueWhereConditions(today = startOfToday()): Prisma.learningWhereInput[] {
  return LEVELS.map((level) => ({
    level,
    date_memorized: { lt: dueCutoff(level, today) },
  }));
}
