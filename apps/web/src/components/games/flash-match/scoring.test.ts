import { describe, expect, it } from 'vitest';
import { isPassed } from './scoring';

describe('isPassed', () => {
  it('needs 80 % of the pairs, rounding the required count up', () => {
    expect(isPassed(8, 8)).toBe(true);
    expect(isPassed(4, 5)).toBe(true);
    expect(isPassed(3, 5)).toBe(false);
    expect(isPassed(7, 9)).toBe(false);
  });
});
