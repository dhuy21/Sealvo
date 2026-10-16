import type { learning_level, Prisma } from '@prisma/client';
import { INTERVALS } from './constants.js';

/** Midnight of the current day in server time (containers run with TZ=UTC). */
export function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * A word at `level` is due when `date_memorized < dueCutoff(level)`.
 * Same rule as the old SQL: DATE(date_memorized) + INTERVAL n DAY <= CURDATE().
 */
export function dueCutoff(level: string, today = startOfToday()): Date {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + 1 - (INTERVALS[level] ?? 0));
  return cutoff;
}

export function isDue(level: string, dateMemorized: Date | null, today = startOfToday()): boolean {
  return (dateMemorized ?? today) < dueCutoff(level, today);
}

/** Prisma `OR` clause matching every learning row that is due today, across all levels. */
export function dueWhereConditions(today = startOfToday()): Prisma.learningWhereInput[] {
  return Object.keys(INTERVALS).map((level) => ({
    level: level as learning_level,
    date_memorized: { lt: dueCutoff(level, today) },
  }));
}
