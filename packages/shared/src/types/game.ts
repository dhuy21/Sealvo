import type { Level, WordType } from './word.js';

export type GameType =
  | 'flash_match'
  | 'vocab_quiz'
  | 'test_pronun'
  | 'word_scramble'
  | 'phrase_completion'
  | 'speed_vocab'
  | 'word_search';

/** POST /games/score */
export interface SubmitScoreRequest {
  game_type: GameType;
  score: number;
}

/** GET /games/scores */
export interface GameScore {
  game_type: GameType;
  best_score: number;
  play_count: number;
  last_played_at: string;
}

export interface GameWord {
  detail_id: number;
  word_id: number;
  word: string;
  language_code: string;
  type: WordType;
  meaning: string;
  pronunciation: string | null;
  example: string | null;
  synonyms: string | null;
}

/** GET /games/:gameType/data */
export interface GameData {
  gameType: GameType;
  level: Level;
  words: GameWord[];
  wordCount: number;
  totalAtLevel: number;
  errorMessage: string | null;
}

/** POST /learning/level-progress/track */
export interface LevelProgressRequest {
  game_type: GameType;
  completed: boolean;
  packageId: number;
}

/** Response of POST /learning/level-progress/track */
export interface TrackLevelProgressResult {
  success: boolean;
  level_completed: boolean;
  words_updated?: number;
  from_level?: Level;
  to_level?: Level;
  missing_games?: GameType[];
}
