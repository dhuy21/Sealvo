import { describe, expect, it } from 'vitest';
import { isPassed, timeLimit, wordPoints } from './scoring';

describe('timeLimit', () => {
  it('gives 100 s plus 6 s per word', () => {
    expect(timeLimit(10)).toBe(160);
  });
});

describe('wordPoints', () => {
  it('gives 10 points plus 1 per letter beyond 4', () => {
    expect(wordPoints('cat', 1)).toBe(10);
    expect(wordPoints('house', 1)).toBe(11);
    expect(wordPoints('elephant', 1)).toBe(14);
  });

  it('adds 5 points per 3-word streak', () => {
    expect(wordPoints('cat', 3)).toBe(15);
    expect(wordPoints('cat', 7)).toBe(20);
  });
});

describe('isPassed', () => {
  it('needs 70 % of the typed words right', () => {
    expect(isPassed(7, 10)).toBe(true);
    expect(isPassed(6, 10)).toBe(false);
    expect(isPassed(0, 0)).toBe(false);
  });

  it('rounds the accuracy first', () => {
    // 69.5 % rounds to 70 %
    expect(isPassed(139, 200)).toBe(true);
  });
});
