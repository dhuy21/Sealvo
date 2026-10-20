import { describe, expect, it } from 'vitest';
import { mockRandom, seedRandom } from '@/test-utils/random';
import { randomIndexExcept, shuffleArray } from './shuffle';

describe('shuffleArray', () => {
  it('returns a permutation without mutating the input', () => {
    seedRandom(1);
    const input = [1, 2, 3, 4, 5, 6];
    const result = shuffleArray(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
    expect(result).not.toBe(input);
    expect([...result].sort()).toEqual(input);
  });

  it('swaps each position from the end with the drawn index (Fisher–Yates)', () => {
    // i=3 → j=0, i=2 → j=0, i=1 → j=0
    mockRandom(0, 0, 0);
    expect(shuffleArray(['a', 'b', 'c', 'd'])).toEqual(['b', 'c', 'd', 'a']);
  });

  it('keeps the order when every draw picks the current position', () => {
    mockRandom(0.99, 0.99, 0.99);
    expect(shuffleArray(['a', 'b', 'c', 'd'])).toEqual(['a', 'b', 'c', 'd']);
  });

  it('handles empty and single-element arrays', () => {
    expect(shuffleArray([])).toEqual([]);
    expect(shuffleArray(['x'])).toEqual(['x']);
  });
});

describe('randomIndexExcept', () => {
  it('draws again until the index differs from the current one', () => {
    const random = mockRandom(0.5, 0.5, 0.9);
    expect(randomIndexExcept(4, 2)).toBe(3);
    expect(random).toHaveBeenCalledTimes(3);
  });

  it('accepts the first draw when it already differs', () => {
    mockRandom(0.1);
    expect(randomIndexExcept(4, 2)).toBe(0);
  });

  it('returns the only index when there is no other choice', () => {
    mockRandom(0.3);
    expect(randomIndexExcept(1, 0)).toBe(0);
  });
});
