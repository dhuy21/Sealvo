import { formatDuration } from './format-duration.js';

describe('formatDuration', () => {
  it.each([
    [60_000, '1 minute'],
    [15 * 60_000, '15 minutes'],
    [3_600_000, '1 heure'],
    [3 * 3_600_000, '3 heures'],
    [90 * 60_000, '90 minutes'],
  ])('formats %d ms as "%s"', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });

  it('rejects durations that are not whole minutes', () => {
    expect(() => formatDuration(1_500)).toThrow();
  });
});
