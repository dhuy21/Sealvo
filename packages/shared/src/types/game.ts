export type GameType =
  | 'flash_match'
  | 'vocab_quiz'
  | 'test_pronun'
  | 'word_scramble'
  | 'phrase_completion'
  | 'speed_vocab'
  | 'word_search';

export interface GameScoreDto {
  score_id: number;
  user_id: string;
  package_id: number;
  game_type: GameType;
  score: number;
  time_spent: number;
  played_at: string;
}

export interface SubmitScoreRequest {
  package_id: number;
  game_type: GameType;
  score: number;
  time_spent: number;
}

export interface LevelProgressRequest {
  package_id: number;
  detail_id: number;
  game_type: GameType;
  correct: boolean;
}
