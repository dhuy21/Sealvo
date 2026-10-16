import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTrackLevelProgress } from '@/hooks/use-games';
import { levelCompletedMessage } from './level-progress';

/**
 * Reports a finished game to the level progress. When that completes the level,
 * notifies the user and flags it so the summary offers "Terminé" instead of replaying.
 */
export function useLevelTracking(gameType: string) {
  const trackLevel = useTrackLevelProgress();
  const [levelFinished, setLevelFinished] = useState(false);

  const track = (completed: boolean, packageId: number) => {
    trackLevel.mutate(
      { game_type: gameType, completed, packageId },
      {
        onSuccess: (data) => {
          const message = levelCompletedMessage(data);
          if (message) {
            toast.success(message);
            setLevelFinished(true);
          }
        },
      },
    );
  };

  return { levelFinished, track };
}
