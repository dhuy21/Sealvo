import { useMemo } from 'react';
import type { Word } from '@/hooks/use-words';
import { LEVELS, type Level } from '@sealvo/shared';
import { matchesSearch } from './word-search';

/** Words matching the search as `[level, words]` pairs in LEVELS order; empty levels are omitted. */
export function useWordsByLevel(words: Word[] | undefined, search: string) {
  return useMemo(() => {
    if (!words) return [];
    let filtered = words;
    const term = search.trim().toLowerCase();
    if (term) {
      filtered = words.filter((w) => matchesSearch(w, term));
    }
    const grouped: [Level, Word[]][] = [];
    for (const level of LEVELS) {
      const levelWords = filtered.filter((w) => w.level === level);
      if (levelWords.length > 0) {
        grouped.push([level, levelWords]);
      }
    }
    return grouped;
  }, [words, search]);
}
