import { wordTypeToDb, type WordType } from '@sealvo/shared';

/** Word types are displayed as stored in the database: phrasal verbs as `ph.v`. */
export function displayWordType(type: WordType): string {
  return wordTypeToDb(type);
}

/** `type : meaning`, or just the meaning when the word has no type. */
export function formatTypeMeaning(type: WordType | null | undefined, meaning: string): string {
  return type ? `${displayWordType(type)} : ${meaning}` : meaning;
}
