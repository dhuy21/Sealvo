import { describe, expect, it } from 'vitest';
import { LEVELS } from '@sealvo/shared';
import { INITIAL_LEVELS, buildDeck, freshProgress } from './deck';
import type { ReviewWord } from '@/hooks/use-words';

function reviewWord(id: number, level: string, dueToday: boolean): ReviewWord {
  return { detail_id: id, level, dueToday } as ReviewWord;
}

const words = [
  reviewWord(1, 'x', true),
  reviewWord(2, 'level_0', false),
  reviewWord(3, 'level_1', true),
  reviewWord(4, 'v', false),
  reviewWord(5, 'level_0', true),
];

describe('INITIAL_LEVELS', () => {
  it('selects every level, including v', () => {
    expect([...INITIAL_LEVELS]).toEqual([...LEVELS]);
  });
});

describe('buildDeck', () => {
  it('keeps only words due today in today-words mode, in package order', () => {
    expect(buildDeck(words, INITIAL_LEVELS, 'today-words').map((w) => w.detail_id)).toEqual([1, 3, 5]);
  });

  it('keeps every word of the selected levels in all-words mode', () => {
    const levels = new Set(['level_0', 'v']);
    expect(buildDeck(words, levels, 'all-words').map((w) => w.detail_id)).toEqual([2, 4, 5]);
  });

  it('combines the level filter with the due-today filter', () => {
    expect(buildDeck(words, new Set(['level_0']), 'today-words').map((w) => w.detail_id)).toEqual([5]);
  });

  it('is empty when no level is selected', () => {
    expect(buildDeck(words, new Set(), 'all-words')).toEqual([]);
  });
});

describe('freshProgress', () => {
  it('marks every card unseen', () => {
    expect(freshProgress(3)).toEqual([-1, -1, -1]);
    expect(freshProgress(0)).toEqual([]);
  });
});
