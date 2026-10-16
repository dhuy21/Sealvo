import { useCallback, useState } from 'react';
import { EMPTY_CARD_VALUES, createCard, type WordCard, type WordCardValues } from './word-card';

const REMOVE_ANIMATION_MS = 300;
const SHAKE_ANIMATION_MS = 500;

/** Card list of the multi-word form. Add / duplicate return the new card's key. */
export function useWordCards() {
  const [cards, setCards] = useState<WordCard[]>(() => [createCard()]);

  const patchCard = useCallback((key: number, patch: Partial<WordCard>) => {
    setCards((cs) => cs.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }, []);

  const changeValue = useCallback((key: number, field: keyof WordCardValues, value: string) => {
    setCards((cs) =>
      cs.map((c) => (c.key === key ? { ...c, values: { ...c.values, [field]: value } } : c)),
    );
  }, []);

  const addCard = useCallback(() => {
    const card = createCard();
    setCards((cs) => [...cs, card]);
    return card.key;
  }, []);

  const duplicateCard = useCallback((source: WordCard) => {
    const card = createCard(source.values);
    setCards((cs) => {
      const at = cs.findIndex((c) => c.key === source.key);
      return [...cs.slice(0, at + 1), card, ...cs.slice(at + 1)];
    });
    return card.key;
  }, []);

  /** False (and the card shakes) when it is the last one. */
  const removeCard = useCallback(
    (key: number) => {
      if (cards.length <= 1) {
        patchCard(key, { shaking: true });
        setTimeout(() => patchCard(key, { shaking: false }), SHAKE_ANIMATION_MS);
        return false;
      }
      patchCard(key, { removing: true });
      setTimeout(() => setCards((cs) => cs.filter((c) => c.key !== key)), REMOVE_ANIMATION_MS);
      return true;
    },
    [cards.length, patchCard],
  );

  /** Clears every card like `form.reset()`: the number of cards stays. */
  const clearValues = useCallback(() => {
    setCards((cs) => cs.map((c) => ({ ...c, values: { ...EMPTY_CARD_VALUES } })));
  }, []);

  return { cards, patchCard, changeValue, addCard, duplicateCard, removeCard, clearValues };
}
