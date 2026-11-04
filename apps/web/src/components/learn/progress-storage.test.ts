import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadProgress, saveProgress } from './progress-storage';
import type { ReviewWord } from '@/hooks/use-words';

const PACKAGE_ID = 7;
const STORAGE_KEY = `flashcards_progress_${PACKAGE_ID}`;

function reviewWord(id: number): ReviewWord {
  return { detail_id: id, word: `word${id}` } as ReviewWord;
}

let store: Map<string, string>;

beforeEach(() => {
  store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  });
});

describe('saveProgress', () => {
  it('stores the date, the progress and the deck ids', () => {
    vi.useFakeTimers({ now: new Date('2026-10-17T08:00:00.000Z') });
    saveProgress(PACKAGE_ID, [reviewWord(3), reviewWord(1)], [2, -1]);
    vi.useRealTimers();

    expect(JSON.parse(store.get(STORAGE_KEY)!)).toEqual({
      date: '2026-10-17T08:00:00.000Z',
      progress: [2, -1],
      words: [3, 1],
    });
  });

  it('logs instead of throwing when storage fails', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('quota');
      },
    });
    expect(() => saveProgress(PACKAGE_ID, [reviewWord(1)], [0])).not.toThrow();
    expect(error).toHaveBeenCalledWith('Save progress error:', expect.any(Error));
  });
});

describe('loadProgress', () => {
  it('returns null when nothing was saved', () => {
    expect(loadProgress(PACKAGE_ID, [reviewWord(1)])).toBeNull();
  });

  it('restores the saved order and progress for the same set of words', () => {
    saveProgress(PACKAGE_ID, [reviewWord(2), reviewWord(1), reviewWord(3)], [0, 2, -1]);
    const deck = [reviewWord(1), reviewWord(2), reviewWord(3)];

    const restored = loadProgress(PACKAGE_ID, deck);

    expect(restored?.deck.map((w) => w.detail_id)).toEqual([2, 1, 3]);
    expect(restored?.deck[0]).toBe(deck[1]);
    expect(restored?.progress).toEqual([0, 2, -1]);
  });

  it('keeps each package session separate', () => {
    saveProgress(1, [reviewWord(1)], [2]);
    saveProgress(2, [reviewWord(9)], [0]);

    expect(loadProgress(1, [reviewWord(1)])?.progress).toEqual([2]);
    expect(loadProgress(2, [reviewWord(9)])?.progress).toEqual([0]);
  });

  it('gives the old shared session to the first matching package only', () => {
    store.set(
      'flashcards_progress',
      JSON.stringify({ date: '2026-10-17T08:00:00.000Z', progress: [2], words: [1] }),
    );

    expect(loadProgress(2, [reviewWord(9)])).toBeNull();
    expect(store.has('flashcards_progress')).toBe(true);

    expect(loadProgress(1, [reviewWord(1)])?.progress).toEqual([2]);
    expect(store.has('flashcards_progress')).toBe(false);
    expect(loadProgress(2, [reviewWord(1)])).toBeNull();
  });

  it('returns null when the set of words changed', () => {
    saveProgress(PACKAGE_ID, [reviewWord(1), reviewWord(2)], [0, 2]);
    expect(loadProgress(PACKAGE_ID, [reviewWord(1), reviewWord(3)])).toBeNull();
    expect(loadProgress(PACKAGE_ID, [reviewWord(1)])).toBeNull();
    expect(loadProgress(PACKAGE_ID, [reviewWord(1), reviewWord(2), reviewWord(3)])).toBeNull();
  });

  it('returns null and logs when the saved data is corrupt', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    store.set(STORAGE_KEY, '{not json');
    expect(loadProgress(PACKAGE_ID, [reviewWord(1)])).toBeNull();
    expect(error).toHaveBeenCalledWith('Load progress error:', expect.any(SyntaxError));
  });
});
