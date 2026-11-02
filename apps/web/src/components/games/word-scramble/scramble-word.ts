import { shuffleArray } from '@/lib/shuffle';

/** The word's letters shuffled, never left in their original order (unless every letter is the same). */
export function scrambleWord(word: string): string {
  const letters = word.split('');
  if (new Set(letters).size < 2) return word;
  let scrambled: string;
  do {
    scrambled = shuffleArray(letters).join('');
  } while (scrambled === word);
  return scrambled;
}
