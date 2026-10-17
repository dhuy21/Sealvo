import { describe, expect, it } from 'vitest';
import { answerPoints, isPassed, questionCount, timeLimit } from './scoring';

describe('questionCount', () => {
  it('asks every word once plus half as many again, capping the first part at 100', () => {
    expect(questionCount(10)).toBe(15);
    expect(questionCount(5)).toBe(7);
    expect(questionCount(150)).toBe(175);
  });
});

describe('timeLimit', () => {
  it('gives 200 s plus 4 s per question', () => {
    expect(timeLimit(15)).toBe(260);
  });
});

describe('answerPoints', () => {
  it('adds up to 5 points for answering within 10 s', () => {
    expect(answerPoints(2, 1, 1)).toBe(15);
    expect(answerPoints(7.4, 1, 1)).toBe(13);
    expect(answerPoints(30, 1, 1)).toBe(10);
  });

  it('adds 5 points per 3-answer streak', () => {
    expect(answerPoints(30, 3, 1)).toBe(15);
    expect(answerPoints(30, 6, 1)).toBe(20);
  });

  it('removes 2 points per attempt after the first', () => {
    expect(answerPoints(30, 1, 3)).toBe(6);
  });
});

describe('isPassed', () => {
  it('needs 80 % of all the questions answered correctly', () => {
    expect(isPassed(12, 15)).toBe(true);
    expect(isPassed(11, 15)).toBe(false);
    expect(isPassed(0, 0)).toBe(false);
  });
});
