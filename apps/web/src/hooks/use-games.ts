import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  GameData,
  GameScore,
  GameType,
  LevelProgressRequest,
  SubmitScoreRequest,
  TrackLevelProgressResult,
} from '@sealvo/shared';
import api from '@/lib/api';

export type { GameData, GameWord, TrackLevelProgressResult } from '@sealvo/shared';

export function useGameData(gameType: GameType, packageId: number | null) {
  return useQuery({
    queryKey: ['game', gameType, packageId],
    queryFn: async () => {
      const { data } = await api.get<GameData>(`/games/${gameType}/data`, {
        params: { packageId },
      });
      return data;
    },
    enabled: !!packageId,
  });
}

export function useSaveScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SubmitScoreRequest) => {
      const { data } = await api.post('/games/score', payload);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['scores'] });
    },
  });
}

export function useTrackLevelProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: LevelProgressRequest) => {
      const { data } = await api.post<TrackLevelProgressResult>('/learning/level-progress/track', payload);
      return data;
    },
    onSuccess: (_data, { packageId }) => {
      void qc.invalidateQueries({ queryKey: ['game'] });
      void qc.invalidateQueries({ queryKey: ['words', packageId] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUserScores() {
  return useQuery({
    queryKey: ['scores'],
    queryFn: async () => {
      const { data } = await api.get<GameScore[]>('/games/scores');
      return data;
    },
  });
}
