import { describe, expect, it, vi } from 'vitest';
import { seedRandom } from '@/test-utils/random';
import { GRID_SIZE, cellKey, findWordInGrid, generateGrid, normalizeWord } from './grid';

describe('normalizeWord', () => {
  it('upper-cases and keeps only A–Z', () => {
    expect(normalizeWord("look up-to it's")).toBe('LOOKUPTOITS');
    expect(normalizeWord('café')).toBe('CAF');
  });
});

describe('cellKey', () => {
  it('joins row and column', () => {
    expect(cellKey(3, 12)).toBe('3,12');
  });
});

describe('findWordInGrid', () => {
  const grid = [
    ['C', 'A', 'T', 'X'],
    ['X', 'O', 'X', 'X'],
    ['X', 'X', 'G', 'X'],
    ['D', 'O', 'G', 'X'],
  ];

  it('finds a word left to right', () => {
    expect(findWordInGrid(grid, 'CAT')).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ]);
  });

  it('finds a word on a diagonal', () => {
    expect(findWordInGrid(grid, 'COG')).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 1 },
      { row: 2, col: 2 },
    ]);
  });

  it('finds a word written backwards', () => {
    expect(findWordInGrid(grid, 'GOD')).toEqual([
      { row: 3, col: 2 },
      { row: 3, col: 1 },
      { row: 3, col: 0 },
    ]);
  });

  it('returns null when the word is absent', () => {
    expect(findWordInGrid(grid, 'BIRD')).toBeNull();
  });
});

describe('generateGrid', () => {
  it('fills a 15×15 grid with upper-case letters', () => {
    seedRandom(1);
    const grid = generateGrid(['apple', 'banana']);
    expect(grid).toHaveLength(GRID_SIZE);
    for (const row of grid) {
      expect(row).toHaveLength(GRID_SIZE);
      for (const cell of row) expect(cell).toMatch(/^[A-Z]$/);
    }
  });

  it('places every word (normalized) somewhere in the grid', () => {
    seedRandom(2);
    const words = ['apple', 'Banana', 'ice cream', 'look-up', 'zebra'];
    const grid = generateGrid(words);
    for (const w of words) expect(findWordInGrid(grid, normalizeWord(w))).not.toBeNull();
  });

  it('is reproducible for the same random sequence', () => {
    seedRandom(5);
    const first = generateGrid(['apple', 'pear']);
    seedRandom(5);
    expect(generateGrid(['apple', 'pear'])).toEqual(first);
  });

  it('skips one-letter words and words longer than the grid', () => {
    // Every filler letter is Q, so any placed letter would show up.
    vi.spyOn(Math, 'random').mockReturnValue(16 / 26);
    const grid = generateGrid(['a', 'abcdefghijklmnop']);
    expect(grid.flat().every((c) => c === 'Q')).toBe(true);
  });
});
