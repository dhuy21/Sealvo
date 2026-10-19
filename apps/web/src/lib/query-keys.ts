import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { GameType } from '@sealvo/shared';

/** React Query keys. Hierarchical: invalidating a key also invalidates every key it prefixes. */
export const queryKeys = {
  allWords: () => ['words'] as const,
  words: (packageId: number | null) => ['words', packageId] as const,
  reviewWords: (packageId: number | null) => ['words', packageId, 'review'] as const,
  games: () => ['game'] as const,
  game: (gameType: GameType, packageId: number | null) => ['game', gameType, packageId] as const,
  scores: () => ['scores'] as const,
  packages: () => ['packages'] as const,
  myPackages: () => ['packages', 'mine'] as const,
  publicPackages: () => ['packages', 'public'] as const,
  package: (packageId: number | null) => ['packages', 'detail', packageId] as const,
  dashboard: () => ['dashboard'] as const,
  activities: () => ['activities'] as const,
};

/** Mark the queries stale without waiting for their refetch */
export function invalidate(qc: QueryClient, ...keys: QueryKey[]): void {
  for (const queryKey of keys) void qc.invalidateQueries({ queryKey });
}

/** Everything that lists or counts a package's words: the list, the game data, the dashboard */
export function invalidateWords(qc: QueryClient, packageId: number): void {
  invalidate(qc, queryKeys.words(packageId), queryKeys.games(), queryKeys.dashboard());
}
