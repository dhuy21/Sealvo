/** Prisma enum `word_details_type`: phrasal verbs are `ph_v` in the API, `ph.v` in the database */
export type WordType = 'noun' | 'verb' | 'adjective' | 'adverb' | 'ph_v' | 'idiom' | 'collocation';

/** Prisma enum `learning_level`: `level_0`..`level_2` are `0`..`2` in the database */
export type Level = 'x' | 'level_0' | 'level_1' | 'level_2' | 'v';
