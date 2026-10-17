import type { TrackLevelProgressResult } from '@/hooks/use-games';
import { levelLabel } from '@sealvo/shared';

/** Message shown when the tracked game completed its level and promoted words; `null` otherwise. */
export function levelCompletedMessage(data: TrackLevelProgressResult): string | null {
  if (!data.level_completed || !data.words_updated || data.words_updated <= 0) return null;
  return `Niveau terminé! ${data.words_updated} mots sont passés au niveau ${data.to_level ? levelLabel(data.to_level) : ''}`;
}
