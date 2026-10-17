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
import { queryKeys } from '@/lib/query-keys';

export type { GameData, GameWord, TrackLevelProgressResult } from '@sealvo/shared';

export function useGameData(gameType: GameType, packageId: number | null) {
  return useQuery({
    queryKey: queryKeys.game(gameType, packageId),
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
      void qc.invalidateQueries({ queryKey: queryKeys.scores() });
    },
  });
}

export function useTrackLevelProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: LevelProgressRequest) => {
      const { data } = await api.post<TrackLevelProgressResult>(
        '/learning/level-progress/track',
        payload,
      );
      return data;
    },
    onSuccess: (_data, { packageId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.games() });
      void qc.invalidateQueries({ queryKey: queryKeys.words(packageId) });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
    },
  });
}

export function useUserScores() {
  return useQuery({
    queryKey: queryKeys.scores(),
    queryFn: async () => {
      const { data } = await api.get<GameScore[]>('/games/scores');
      return data;
    },
  });
}
