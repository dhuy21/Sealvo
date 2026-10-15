import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

export interface GameWord {
  detail_id: number;
  word_id: number;
  word: string;
  language_code: string;
  meaning: string;
  pronunciation: string | null;
  example: string | null;
  synonyms: string | null;
}

export interface GameData {
  gameType: string;
  level: string;
  words: GameWord[];
  wordCount: number;
  totalAtLevel: number;
  errorMessage: string | null;
}

export function useGameData(gameType: string, packageId: number | null) {
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
  return useMutation({
    mutationFn: async (payload: { game_type: string; score: number }) => {
      const { data } = await api.post('/games/score', payload);
      return data;
    },
  });
}

export function useTrackLevelProgress() {
  return useMutation({
    mutationFn: async (payload: { game_type: string; completed: boolean; packageId: number }) => {
      const { data } = await api.post('/learning/level-progress/track', payload);
      return data;
    },
  });
}

export function useUserScores() {
  return useQuery({
    queryKey: ['scores'],
    queryFn: async () => {
      const { data } = await api.get('/games/scores');
      return data as {
        game_type: string;
        best_score: number;
        play_count: number;
        last_played_at: string;
      }[];
    },
  });
}
