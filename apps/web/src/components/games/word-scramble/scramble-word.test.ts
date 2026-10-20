import { describe, expect, it } from 'vitest';
import { mockRandom, seedRandom } from '@/test-utils/random';
import { scrambleWord } from './scramble-word';

describe('scrambleWord', () => {
  it('returns the same letters in a different order', () => {
    seedRandom(1);
    for (const word of ['apple', 'banana', 'to', 'ice cream']) {
      const scrambled = scrambleWord(word);
      expect(scrambled).not.toBe(word);
      expect([...scrambled].sort()).toEqual([...word].sort());
    }
  });

  it('shuffles again while the result equals the word', () => {
    // First shuffle keeps "ab" (j = 1), the second swaps it (j = 0).
    const random = mockRandom(0.9, 0);
    expect(scrambleWord('ab')).toBe('ba');
    expect(random).toHaveBeenCalledTimes(2);
  });

  it('returns a word that cannot be scrambled unchanged', () => {
    expect(scrambleWord('a')).toBe('a');
    expect(scrambleWord('aaa')).toBe('aaa');
  });
});
