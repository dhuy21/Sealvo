import { describe, expect, it } from 'vitest';
import { finalScore, foundWordPoints, isPassed, selectionAccuracy, timeLimit } from './scoring';

describe('timeLimit', () => {
  it('gives 300 s plus 13 s per word', () => {
    expect(timeLimit(10)).toBe(430);
  });
});

describe('foundWordPoints', () => {
  it('gives 5 points per letter', () => {
    expect(foundWordPoints('HOUSE')).toBe(25);
  });
});

describe('finalScore', () => {
  it('adds 100 points only when every word is found', () => {
    expect(finalScore(80, 10, 10)).toBe(180);
    expect(finalScore(80, 9, 10)).toBe(80);
  });
});

describe('selectionAccuracy', () => {
  it('is the rounded share of selections that found a word, 0 before any selection', () => {
    expect(selectionAccuracy(2, 1)).toBe(67);
    expect(selectionAccuracy(5, 0)).toBe(100);
    expect(selectionAccuracy(0, 4)).toBe(0);
    expect(selectionAccuracy(0, 0)).toBe(0);
  });

  it('never exceeds 100 %, however few the wrong selections', () => {
    expect(selectionAccuracy(10, 1)).toBe(91);
  });
});

describe('isPassed', () => {
  it('needs 70 % of the words found, rounding the required count up', () => {
    expect(isPassed(7, 10)).toBe(true);
    expect(isPassed(6, 10)).toBe(false);
    expect(isPassed(3, 3)).toBe(true);
    expect(isPassed(2, 3)).toBe(false);
  });
});
