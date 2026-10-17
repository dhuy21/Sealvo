import { describe, expect, it } from 'vitest';
import { accuracy, isPassed, timeLimit } from './scoring';

describe('timeLimit', () => {
  it('gives 110 s plus 9 s per word', () => {
    expect(timeLimit(10)).toBe(200);
  });
});

describe('accuracy', () => {
  it('is the rounded percentage of correct answers, 0 before the first answer', () => {
    expect(accuracy(2, 3)).toBe(67);
    expect(accuracy(0, 0)).toBe(0);
  });
});

describe('isPassed', () => {
  it('needs an accuracy of 80 %', () => {
    expect(isPassed(80)).toBe(true);
    expect(isPassed(79)).toBe(false);
  });
});
