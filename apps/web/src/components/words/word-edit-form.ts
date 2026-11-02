import type { UpdateWordPayload, Word } from '@/hooks/use-words';

export const REQUIRED_FIELDS_MESSAGE = 'Veuillez remplir tous les champs obligatoires';

export interface WordEditForm {
  word: string;
  language_code: string;
  type: string;
  meaning: string;
  pronunciation: string;
  synonyms: string;
  antonyms: string;
  example: string;
  grammar: string;
}

export function wordEditForm(w: Word): WordEditForm {
  return {
    word: w.word,
    language_code: w.language_code,
    type: w.type,
    meaning: w.meaning,
    pronunciation: w.pronunciation ?? '',
    synonyms: w.synonyms ?? '',
    antonyms: w.antonyms ?? '',
    example: w.example ?? '',
    grammar: w.grammar ?? '',
  };
}

/** Trimmed payload, or `null` when a field the old inline edit required (word, language, type, meaning, example) is empty. */
export function toUpdatePayload(form: WordEditForm): UpdateWordPayload | null {
  const dto = Object.fromEntries(
    Object.entries(form).map(([field, value]) => [field, value.trim()]),
  ) as WordEditForm;
  if (!dto.word || !dto.language_code || !dto.type || !dto.meaning || !dto.example) return null;
  return dto;
}
