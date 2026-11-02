import { describe, expect, it, vi } from 'vitest';
import { calculatePronunciationAccuracy, formatTime } from './pronunciation';

vi.mock('@/lib/tts', () => ({ AudioPlaybackError: class extends Error {}, playTts: vi.fn() }));

describe('formatTime', () => {
  it('formats milliseconds as mm:ss, dropping the remainder', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(59_999)).toBe('00:59');
    expect(formatTime(61_000)).toBe('01:01');
    expect(formatTime(600_000)).toBe('10:00');
  });
});

describe('calculatePronunciationAccuracy', () => {
  it('scores an exact match 95 plus up to 5 for confidence, ignoring case and punctuation', () => {
    expect(calculatePronunciationAccuracy('hello', 'hello', 0)).toBe(95);
    expect(calculatePronunciationAccuracy('Hello!', 'hello', 0.5)).toBe(97.5);
    expect(calculatePronunciationAccuracy('hello', 'hello', 1)).toBe(100);
  });

  it('scores 75–85 when one contains the other', () => {
    expect(calculatePronunciationAccuracy('the cat', 'cat', 0)).toBe(75);
    expect(calculatePronunciationAccuracy('cat', 'the cat', 0.4)).toBe(81);
    expect(calculatePronunciationAccuracy('the cat', 'cat', 1)).toBe(85);
  });

  it('scores a dissimilar word low, never under 10', () => {
    expect(calculatePronunciationAccuracy('xyz', 'banana', 1)).toBe(10);
    // Levenshtein similarity 0.5 → round(0.5 * 30)
    expect(calculatePronunciationAccuracy('abcd', 'abxy', 1)).toBe(15);
  });

  it('accepts a phonetic variant of a close word with 80–90', () => {
    // "back" → "bak" (ck$ → k), similarity 0.75
    expect(calculatePronunciationAccuracy('bak', 'back', 0)).toBe(80);
    expect(calculatePronunciationAccuracy('bak', 'back', 1)).toBe(90);
  });

  it('scores other close words from their similarity, capped at 75', () => {
    // similarity 0.8: 0.8 * 70 = 56, +5 for the shared start, +10 * confidence
    expect(calculatePronunciationAccuracy('housr', 'house', 0)).toBe(61);
    expect(calculatePronunciationAccuracy('housr', 'house', 1)).toBe(71);
    // similarity 6/7: 60 + 5 + 10 = 75 → capped
    expect(calculatePronunciationAccuracy('kitchem', 'kitchen', 1)).toBe(75);
  });
});
