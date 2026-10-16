import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface StreakResult {
  updated: boolean;
  streak: number;
  reason?: string;
}

export function useRecordStreak() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<StreakResult>('/learning/streak');
      return data;
    },
    onSuccess: (data) => {
      if (data.updated) void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
