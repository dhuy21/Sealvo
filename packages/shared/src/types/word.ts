/** Prisma enum `word_details_type`: phrasal verbs are `ph_v` in the API, `ph.v` in the database */
export type WordType = 'noun' | 'verb' | 'adjective' | 'adverb' | 'ph_v' | 'idiom' | 'collocation';

/** Prisma enum `learning_level`: `level_0`..`level_2` are `0`..`2` in the database */
export type Level = 'x' | 'level_0' | 'level_1' | 'level_2' | 'v';

/** GET /packages/:packageId/words */
export interface WordDto {
  detail_id: number;
  word_id: number;
  word: string;
  language_code: string;
  subject: string;
  type: WordType;
  meaning: string;
  pronunciation: string | null;
  synonyms: string | null;
  antonyms: string | null;
  example: string | null;
  grammar: string | null;
  level: Level;
  package_id: number;
}

/** GET /packages/:packageId/words/review */
export interface ReviewWordDto extends WordDto {
  dueToday: boolean;
}
