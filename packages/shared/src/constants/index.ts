import type { GameType } from '../types/game.js';
import type { Level } from '../types/word.js';

/** 18 supported language codes (Google TTS compatible) */
export const VALID_LANGS = [
  'en-US', 'en-GB', 'fr-FR', 'es-ES', 'de-DE', 'it-IT',
  'ja-JP', 'zh-CN', 'zh-HK', 'zh-TW', 'pt-PT', 'ru-RU',
  'vi-VN', 'ko-KR', 'id-ID', 'hi-IN', 'pl-PL', 'nl-NL',
] as const;

export type LanguageCode = (typeof VALID_LANGS)[number];

/** 7 word types */
export const VALID_TYPES = [
  'noun', 'verb', 'adjective', 'adverb', 'ph.v', 'idiom', 'collocation',
] as const;

/** Spaced repetition levels */
export const VALID_LEVELS: readonly Level[] = ['x', '0', '1', '2', 'v'] as const;

/** Spaced repetition intervals (days) */
export const LEVEL_INTERVALS: Record<Level, number> = {
  x: 0,
  '0': 2,
  '1': 4,
  '2': 10,
  v: 20,
};

/** Games required per level to promote */
export const LEVEL_GAMES: Record<Exclude<Level, 'v'>, readonly GameType[]> = {
  x: ['flash_match', 'vocab_quiz', 'test_pronun'],
  '0': ['word_scramble', 'phrase_completion'],
  '1': ['speed_vocab'],
  '2': ['word_search'],
};

/** All game types */
export const ALL_GAME_TYPES: readonly GameType[] = [
  'flash_match', 'vocab_quiz', 'test_pronun',
  'word_scramble', 'phrase_completion',
  'speed_vocab', 'word_search',
] as const;
