export type WordType =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'ph.v'
  | 'idiom'
  | 'collocation';

export type Level = 'x' | '0' | '1' | '2' | 'v';

export interface WordDto {
  detail_id: number;
  word_id: number;
  word: string;
  language_code: string;
  subject: string;
  meaning: string;
  type: WordType;
  pronunciation: string | null;
  synonyms: string | null;
  antonyms: string | null;
  example: string | null;
  grammar: string | null;
  level: Level;
  package_id: number;
}

export interface CreateWordRequest {
  word: string;
  language_code: string;
  subject: string;
  type: WordType;
  meaning: string;
  pronunciation?: string;
  synonyms?: string;
  antonyms?: string;
  example?: string;
  grammar?: string;
}

export interface UpdateWordRequest {
  word?: string;
  language_code?: string;
  subject?: string;
  type?: WordType;
  meaning?: string;
  pronunciation?: string;
  synonyms?: string;
  antonyms?: string;
  example?: string;
  grammar?: string;
}

export interface ImportWordsRequest {
  language_code: string;
  subject: string;
}
