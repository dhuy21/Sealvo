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
};
