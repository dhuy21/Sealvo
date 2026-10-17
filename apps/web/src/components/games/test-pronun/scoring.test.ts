import { describe, expect, it } from 'vitest';
import { averageAccuracy, isPassed } from './scoring';

describe('averageAccuracy', () => {
  it('is the unrounded mean, 0 before the first word', () => {
    expect(averageAccuracy(250, 3)).toBeCloseTo(83.33, 2);
    expect(averageAccuracy(0, 0)).toBe(0);
  });
});

describe('isPassed', () => {
  it('needs an average of 70 % over at least 5 words', () => {
    expect(isPassed(70, 5)).toBe(true);
    expect(isPassed(69.9, 10)).toBe(false);
    expect(isPassed(100, 4)).toBe(false);
  });
});
