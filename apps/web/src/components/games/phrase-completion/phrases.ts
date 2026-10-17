import type { GameWord } from '@/hooks/use-games';
import { BOLD_MARKUP } from '@/lib/bold-markup';
import { shuffleArray } from '@/lib/shuffle';

export interface Phrase {
  phrase: string;
  word: string;
  meaningWord: string;
  correctWords: string[];
}

const BLANK = '_____';

export function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** One phrase per word; an example without `**…**` (or no example) gives a phrase with no blank. */
export function generatePhrases(words: GameWord[]): Phrase[] {
  const phrases = words.map((w) => {
    let phrase = '';
    let correctWords: string[] = [];

    if (w.example && w.example.trim() !== '') {
      correctWords = [...w.example.matchAll(BOLD_MARKUP)].map((m) => m[1]);
      phrase = w.example.replace(BOLD_MARKUP, BLANK);
    }
    return { phrase, word: w.word, meaningWord: w.meaning, correctWords };
  });
  return shuffleArray(phrases);
}

/** `count` phrases, cycling through `phrases` in order. */
export function repeatPhrases(phrases: Phrase[], count: number): Phrase[] {
  return Array.from({ length: count }, (_, i) => phrases[i % phrases.length]);
}

/** The phrase as HTML, its blanks filled in order with the answers wrapped in `<span class={className}>`. */
export function revealAnswers(phrase: Phrase, className: string): string {
  let html = escapeHtml(phrase.phrase);
  for (const w of phrase.correctWords) {
    // A function: a replacement string would expand `$&`, `$'`... typed in the word
    html = html.replace(BLANK, () => `<span class="${className}">${escapeHtml(w)}</span>`);
  }
  return html;
}
