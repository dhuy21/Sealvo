import type { GameWord } from '@sealvo/shared';

export function gameWord(id: number, overrides: Partial<GameWord> = {}): GameWord {
  return {
    detail_id: id,
    word_id: id,
    word: `word${id}`,
    language_code: 'en-US',
    type: 'noun',
    meaning: `meaning${id}`,
    pronunciation: null,
    example: null,
    synonyms: null,
    ...overrides,
  };
}
