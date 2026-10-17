import type { GameWord } from '@/hooks/use-games';
import { shuffleArray } from '@/lib/shuffle';
import { formatTypeMeaning } from '@/lib/word-type';
import type { Card } from './FlashMatchBoard';

const MAX_PAIRS = 15;

/** A word card and a meaning card for up to 15 random words, shuffled together. */
export function generateCards(words: GameWord[]): Card[] {
  const selected = shuffleArray(words).slice(0, MAX_PAIRS);
  const cards: Card[] = [];
  selected.forEach((w) => {
    cards.push({ pairId: w.detail_id, type: 'word', content: w.word, flipped: false, matched: false });
    cards.push({
      pairId: w.detail_id,
      type: 'meaning',
      content: formatTypeMeaning(w.type, w.meaning),
      flipped: false,
      matched: false,
    });
  });
  return shuffleArray(cards);
}
