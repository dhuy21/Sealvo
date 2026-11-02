import type { TrackLevelProgressResult } from '@/hooks/use-games';
import { levelLabel, type GameType } from '@sealvo/shared';

/**
 * Minimum accuracy (%) for a game to count as completed for its level; how accuracy is measured
 * is game-specific (see each game's scoring.ts). Test Pronun also needs `minWords` pronounced.
 */
export const PASS_RULES = {
  flash_match: { minAccuracy: 80 },
  vocab_quiz: { minAccuracy: 70 },
  test_pronun: { minAccuracy: 70, minWords: 5 },
  word_scramble: { minAccuracy: 80 },
  phrase_completion: { minAccuracy: 80 },
  speed_vocab: { minAccuracy: 70 },
  word_search: { minAccuracy: 70 },
} as const satisfies Record<GameType, { minAccuracy: number; minWords?: number }>;

/** Rounded percentage of `part` in `total`; 0 when `total` is 0. */
export function percentage(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/** Whether `count` reaches `minAccuracy` % of `total`, rounding the required count up. */
export function reachesShare(count: number, total: number, minAccuracy: number): boolean {
  return count >= Math.ceil(total * (minAccuracy / 100));
}

/** Message shown when the tracked game completed its level and promoted words; `null` otherwise. */
export function levelCompletedMessage(data: TrackLevelProgressResult): string | null {
  if (!data.level_completed || !data.words_updated || data.words_updated <= 0) return null;
  return `Niveau terminé! ${data.words_updated} mots sont passés au niveau ${data.to_level ? levelLabel(data.to_level) : ''}`;
}
