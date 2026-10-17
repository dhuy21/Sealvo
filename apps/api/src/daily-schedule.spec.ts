import { dailyCron, maxGapMs } from './daily-schedule.js';

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
});
