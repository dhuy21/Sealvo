import { dailyCron, maxGapMs, msUntilNextRun } from './daily-schedule.js';

const HOUR_MS = 3_600_000;

describe('daily schedule', () => {
  it('builds the cron expression from the hours', () => {
    expect(dailyCron([6, 12, 18, 23])).toBe('0 6,12,18,23 * * *');
  });

  it('measures the longest gap, including the one across midnight', () => {
    expect(maxGapMs([6, 12, 18, 23])).toBe(7 * HOUR_MS);
    expect(maxGapMs([23, 6])).toBe(17 * HOUR_MS);
    expect(maxGapMs([8])).toBe(24 * HOUR_MS);
  });

  it('measures the wait until the next run on the Paris clock', () => {
    const hours = [6, 12, 18, 23];
    // 11:58 in Paris (UTC+2 in October)
    expect(msUntilNextRun(hours, new Date('2026-10-17T09:58:00Z'), 'Europe/Paris')).toBe(
      2 * 60_000,
    );
    // 23:30 → 06:00 the next day
    expect(msUntilNextRun(hours, new Date('2026-10-17T21:30:00Z'), 'Europe/Paris')).toBe(
      6.5 * HOUR_MS,
    );
    // Exactly on a run: the next one
    expect(msUntilNextRun([8], new Date('2026-10-17T06:00:00Z'), 'Europe/Paris')).toBe(
      24 * HOUR_MS,
    );
  });
});
