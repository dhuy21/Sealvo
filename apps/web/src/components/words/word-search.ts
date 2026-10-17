import type { Word } from '@/hooks/use-words';
import { stripBoldMarkup } from '@/lib/bold-markup';
import { wordTypeLabel } from './constants';

/** Text of the cells `WordRow` displays, in column order, so search matches what is on screen. */
function displayedText(w: Word): string {
  return [
    w.word,
    w.language_code,
    wordTypeLabel(w.type),
    w.meaning,
    w.pronunciation,
    w.synonyms,
    w.antonyms,
    w.example && stripBoldMarkup(w.example),
    w.grammar,
  ]
    .map((cell) => cell ?? '')
    .join(' ')
    .toLowerCase();
}

/** `term` must be trimmed and lower-cased. */
export function matchesSearch(w: Word, term: string): boolean {
  return displayedText(w).includes(term);
}
