const HOUR_MS = 3_600_000;

/** Cron expression running at minute 0 of the given hours, every day */
export const dailyCron = (hours: readonly number[]) => `0 ${hours.join(',')} * * *`;

/** Longest wait between two consecutive runs, across midnight: beyond it a run was missed */
export function maxGapMs(hours: readonly number[]): number {
  const sorted = [...hours].sort((a, b) => a - b);
  const gaps = sorted.map((hour, i) => (sorted[(i + 1) % sorted.length] - hour + 24) % 24 || 24);
  return Math.max(...gaps) * HOUR_MS;
}
