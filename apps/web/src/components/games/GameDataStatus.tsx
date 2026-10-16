'use client';

import { useRouter } from 'next/navigation';
import type { GameData } from '@/hooks/use-games';
import { getApiErrorMessage } from '@/lib/api-error';

/** Loading / error state of `useGameData`; renders nothing once the game is playable. */
export function GameDataStatus({
  isLoading,
  error,
  data,
  packageId,
}: {
  isLoading: boolean;
  error: unknown;
  data: GameData | undefined;
  packageId: number;
}) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <i className="fas fa-spinner fa-spin fa-2x"></i>
      </div>
    );
  }

  if (!data && error) {
    return (
      <div className="error-box">
        <i className="fas fa-exclamation-triangle"></i>
        <p>{getApiErrorMessage(error, 'Impossible de charger les données du jeu.')}</p>
      </div>
    );
  }

  if (data?.errorMessage) {
    return (
      <div className="error-box">
        <i className="fas fa-exclamation-triangle"></i>
        <p>{data.errorMessage}</p>
        <button className="btn add-words-btn" onClick={() => router.push(`/words?package=${packageId}`)}>
          Ajouter des mots
        </button>
      </div>
    );
  }

  return null;
}
