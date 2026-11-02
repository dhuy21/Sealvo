const HOUR_MS = 3_600_000;

/** Cron expression running at minute 0 of the given hours, every day */
export const dailyCron = (hours: readonly number[]) => `0 ${hours.join(',')} * * *`;

/** Longest wait between two consecutive runs, across midnight: beyond it a run was missed */
export function maxGapMs(hours: readonly number[]): number {
  const sorted = [...hours].sort((a, b) => a - b);
  const gaps = sorted.map((hour, i) => (sorted[(i + 1) % sorted.length] - hour + 24) % 24 || 24);
  return Math.max(...gaps) * HOUR_MS;
}

/** Time until the next of the given hours (minute 0) on the clock of `timeZone` */
export function msUntilNextRun(hours: readonly number[], now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  const secondOfDay = part('hour') * 3600 + part('minute') * 60 + part('second');
  const waits = hours.map((hour) => (hour * 3600 - secondOfDay + 86_400) % 86_400 || 86_400);
  return Math.min(...waits) * 1000;
}
