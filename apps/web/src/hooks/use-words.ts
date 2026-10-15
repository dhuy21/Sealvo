import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Word {
  detail_id: number;
  word_id: number;
  word: string;
  language_code: string;
  subject: string;
  type: string;
  meaning: string;
  pronunciation: string | null;
  synonyms: string | null;
  antonyms: string | null;
  example: string | null;
  grammar: string | null;
  level: string;
  package_id: number;
}

export interface CreateWordPayload {
  word: string;
  language_code: string;
  subject: string;
  type: string;
  meaning: string;
  pronunciation?: string;
  synonyms?: string;
  antonyms?: string;
  example?: string;
  grammar?: string;
}

export interface UpdateWordPayload extends Partial<CreateWordPayload> {
  level?: string;
}

export function useWords(packageId: number | null) {
  return useQuery({
    queryKey: ['words', packageId],
    queryFn: async () => {
      const { data } = await api.get<Word[]>(`/packages/${packageId}/words`);
      return data;
    },
    enabled: !!packageId,
  });
}

export function useAddWord(packageId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateWordPayload) => {
      const { data } = await api.post(`/packages/${packageId}/words`, [payload]);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['words', packageId] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateWord(packageId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ detailId, dto }: { detailId: number; dto: UpdateWordPayload }) => {
      const { data } = await api.patch(`/packages/${packageId}/words/${detailId}`, dto);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['words', packageId] });
    },
  });
}

export function useDeleteWord(packageId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (detailId: number) => {
      const { data } = await api.delete(`/packages/${packageId}/words/${detailId}`);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['words', packageId] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteAllWords(packageId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.delete(`/packages/${packageId}/words`);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['words', packageId] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
