import { describe, expect, it } from 'vitest';
import { accuracyFeedback, averageAccuracy, isPassed } from './scoring';

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

describe('accuracyFeedback', () => {
  it('picks the message of the highest threshold reached', () => {
    expect(accuracyFeedback(90)).toBe('Excellent ! Prononciation parfaite !');
    expect(accuracyFeedback(89.9)).toBe('Très bien ! Bonne prononciation !');
    expect(accuracyFeedback(20)).toBe('Essayez encore ! Écoutez bien la prononciation.');
    expect(accuracyFeedback(19)).toBe('Mot incorrect. Réessayez en écoutant attentivement.');
  });
});
