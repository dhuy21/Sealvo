import { VALID_LANGS } from '@sealvo/shared';
import type { CreateWordPayload } from '@/hooks/use-words';

export type WordCardValues = Required<CreateWordPayload>;

export interface WordCard {
  /** React key only: it is not rendered, so it cannot break hydration. */
  key: number;
  values: WordCardValues;
  collapsed: boolean;
  removing: boolean;
  shaking: boolean;
}

/** Defaults of a blank card: first language and level `x` preselected, type left to choose. */
export const EMPTY_CARD_VALUES: WordCardValues = {
  word: '',
  language_code: VALID_LANGS[0],
  subject: '',
  type: '',
  pronunciation: '',
  level: 'x',
  meaning: '',
  example: '',
  synonyms: '',
  antonyms: '',
  grammar: '',
};

let nextKey = 0;

export function createCard(values: WordCardValues = EMPTY_CARD_VALUES): WordCard {
  nextKey += 1;
  return { key: nextKey, values: { ...values }, collapsed: false, removing: false, shaking: false };
}

export function isCardEdited(card: WordCard): boolean {
  return (Object.keys(EMPTY_CARD_VALUES) as (keyof WordCardValues)[]).some(
    (field) => card.values[field] !== EMPTY_CARD_VALUES[field],
  );
}
