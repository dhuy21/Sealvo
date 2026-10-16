import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
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
      void qc.invalidateQueries({ queryKey: ['words', packageId] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
