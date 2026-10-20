import { describe, expect, it } from 'vitest';
import { isPassed, scoreAfterAnswer } from './scoring';

describe('scoreAfterAnswer', () => {
  it('adds 10 points per selected option when right', () => {
    expect(scoreAfterAnswer(20, true, 1)).toBe(30);
    expect(scoreAfterAnswer(20, true, 2)).toBe(40);
  });

  it('removes 5 points per selected option when wrong, never going below 0', () => {
    expect(scoreAfterAnswer(20, false, 2)).toBe(10);
    expect(scoreAfterAnswer(5, false, 2)).toBe(0);
  });
});

describe('isPassed', () => {
  it('needs 70 % of the questions right, rounding the required count up', () => {
    expect(isPassed(7, 10)).toBe(true);
    expect(isPassed(6, 10)).toBe(false);
    expect(isPassed(3, 4)).toBe(true);
    expect(isPassed(2, 3)).toBe(false);
  });
});
