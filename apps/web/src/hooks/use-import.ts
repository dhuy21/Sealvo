import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { WordsSubmitResponse } from './use-words';

export function useImportFile(packageId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post<WordsSubmitResponse>(
        `/packages/${packageId}/import`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data;
    },
    onSuccess: (data) => {
      if (data.async) return;
      void qc.invalidateQueries({ queryKey: queryKeys.words(packageId) });
      void qc.invalidateQueries({ queryKey: queryKeys.games() });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
    },
  });
}
