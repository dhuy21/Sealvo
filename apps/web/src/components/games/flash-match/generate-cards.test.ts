import { describe, expect, it } from 'vitest';
import { gameWord } from '@/test-utils/fixtures';
import { mockRandom, seedRandom } from '@/test-utils/random';
import { generateCards } from './generate-cards';

const words = (count: number) => Array.from({ length: count }, (_, i) => gameWord(i + 1));

describe('generateCards', () => {
  it('makes a face-down word card and meaning card per word', () => {
    seedRandom(1);
    const cards = generateCards(words(4));
    expect(cards).toHaveLength(8);
    expect(cards.every((c) => !c.flipped && !c.matched)).toBe(true);

    for (let id = 1; id <= 4; id++) {
      const pair = cards.filter((c) => c.pairId === id);
      expect(pair.map((c) => c.type).sort()).toEqual(['meaning', 'word']);
      expect(pair.find((c) => c.type === 'word')?.content).toBe(`word${id}`);
      expect(pair.find((c) => c.type === 'meaning')?.content).toBe(`noun : meaning${id}`);
    }
  });

  it('keeps at most 15 pairs', () => {
    seedRandom(2);
    const cards = generateCards(words(20));
    expect(cards).toHaveLength(30);
    expect(new Set(cards.map((c) => c.pairId)).size).toBe(15);
  });

  it('shows phrasal verbs as ph.v on the meaning card', () => {
    seedRandom(3);
    const cards = generateCards([gameWord(1, { type: 'ph_v', meaning: 'give up' })]);
    expect(cards.find((c) => c.type === 'meaning')?.content).toBe('ph.v : give up');
  });

  it('shuffles the words, then the cards', () => {
    // words [1, 2] → [2, 1]; cards [w2, m2, w1, m1] → [m2, w1, m1, w2]
    mockRandom(0, 0, 0, 0);
    const cards = generateCards(words(2));
    expect(cards.map((c) => `${c.type[0]}${c.pairId}`)).toEqual(['m2', 'w1', 'm1', 'w2']);
  });
});
