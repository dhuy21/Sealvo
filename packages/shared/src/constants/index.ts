import type { GameType } from '../types/game.js';
import type { PackageMode } from '../types/package.js';
import type { Level, WordType } from '../types/word.js';

/** 18 supported language codes (Google TTS compatible) */
export const VALID_LANGS = [
  'en-US',
  'en-GB',
  'fr-FR',
  'es-ES',
  'de-DE',
  'it-IT',
  'ja-JP',
  'zh-CN',
  'zh-HK',
  'zh-TW',
  'pt-PT',
  'ru-RU',
  'vi-VN',
  'ko-KR',
  'id-ID',
  'hi-IN',
  'pl-PL',
  'nl-NL',
] as const;

export type LanguageCode = (typeof VALID_LANGS)[number];

/** 7 word types, as the API sends and accepts them */
export const WORD_TYPES: readonly WordType[] = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'ph_v',
  'idiom',
  'collocation',
];

/** Spaced repetition levels, as the API sends and accepts them */
export const LEVELS: readonly Level[] = ['x', 'level_0', 'level_1', 'level_2', 'v'];

/** Word types as written in import spreadsheets (raw database values: `ph.v`, not `ph_v`) */
export const VALID_TYPES = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'ph.v',
  'idiom',
  'collocation',
] as const;

export type DbWordType = (typeof VALID_TYPES)[number];

/** Levels as written in import spreadsheets (raw database values: `0`, not `level_0`) */
export const VALID_LEVELS = ['x', '0', '1', '2', 'v'] as const;

export type DbLevel = (typeof VALID_LEVELS)[number];

/** Package visibility modes */
export const PACKAGE_MODES: readonly PackageMode[] = ['private', 'public', 'protected'];

/** Level as shown to users: its raw database value (`level_0` → `0`) */
export function levelLabel(level: Level): DbLevel {
  return level.replace('level_', '') as DbLevel;
}

/** Inverse of levelLabel (`0` → `level_0`) */
export function levelFromDb(level: DbLevel): Level {
  return level === 'x' || level === 'v' ? level : `level_${level}`;
}

/** Word type as shown to users and written in spreadsheets (`ph_v` → `ph.v`) */
export function wordTypeToDb(type: WordType): DbWordType {
  return type === 'ph_v' ? 'ph.v' : type;
}

/** Inverse of wordTypeToDb (`ph.v` → `ph_v`) */
export function wordTypeFromDb(type: DbWordType): WordType {
  return type === 'ph.v' ? 'ph_v' : type;
}

/** Spaced repetition intervals (days) */
export const LEVEL_INTERVALS: Record<Level, number> = {
  x: 0,
  level_0: 2,
  level_1: 4,
  level_2: 10,
  v: 20,
};

/** All game types, in level order */
export const ALL_GAME_TYPES: readonly GameType[] = [
  'flash_match',
  'vocab_quiz',
  'test_pronun',
  'word_scramble',
  'phrase_completion',
  'speed_vocab',
  'word_search',
];

/** Level whose words each game reviews */
export const GAME_LEVEL: Record<GameType, Exclude<Level, 'v'>> = {
  flash_match: 'x',
  vocab_quiz: 'x',
  test_pronun: 'x',
  word_scramble: 'level_0',
  phrase_completion: 'level_0',
  speed_vocab: 'level_1',
  word_search: 'level_2',
};

/** Games required per level to promote (all must be completed) */
export const LEVEL_GAMES: Record<Exclude<Level, 'v'>, readonly GameType[]> = {
  x: ['flash_match', 'vocab_quiz', 'test_pronun'],
  level_0: ['word_scramble', 'phrase_completion'],
  level_1: ['speed_vocab'],
  level_2: ['word_search'],
};

export * from './auth.js';
export * from './import.js';
