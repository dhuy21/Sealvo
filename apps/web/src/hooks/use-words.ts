import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Level, WordType } from '@sealvo/shared';
import api from '@/lib/api';
import { stripBoldMarkup } from '@/lib/bold-markup';
import { invalidate, invalidateWords, queryKeys } from '@/lib/query-keys';

export interface Word {
  detail_id: number;
  word_id: number;
  word: string;
  language_code: string;
  subject: string;
  type: WordType;
  meaning: string;
  pronunciation: string | null;
  synonyms: string | null;
  antonyms: string | null;
  example: string | null;
  grammar: string | null;
  level: Level;
  package_id: number;
}

export interface ReviewWord extends Word {
  dueToday: boolean;
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
  level?: string;
}

export type UpdateWordPayload = Partial<CreateWordPayload>;

/** Reply of POST words / import: queued jobs (`async`) are followed by the global JobWatcher. */
export interface WordsSubmitResponse {
  success: boolean;
  async: boolean;
  jobId?: string;
  message?: string;
}

export function useWords(packageId: number | null) {
  return useQuery({
    queryKey: queryKeys.words(packageId),
    queryFn: async () => {
      const { data } = await api.get<Word[]>(`/packages/${packageId}/words`);
      return data;
    },
    enabled: !!packageId,
  });
}

/** All words of the package, flagged `dueToday` by spaced repetition, with `**` markers stripped from examples. */
export function useReviewWords(packageId: number | null) {
  return useQuery({
    queryKey: queryKeys.reviewWords(packageId),
    queryFn: async () => {
      const { data } = await api.get<ReviewWord[]>(`/packages/${packageId}/words/review`);
      return data.map((w) => ({ ...w, example: stripBoldMarkup(w.example || '') }));
    },
    enabled: !!packageId,
  });
}

export function useAddWords(packageId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateWordPayload[]) => {
      const { data } = await api.post<WordsSubmitResponse>(`/packages/${packageId}/words`, payload);
      return data;
    },
    onSuccess: (data) => {
      if (data.async) return;
      invalidateWords(qc, packageId);
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
      // The dashboard counts words per level
      invalidateWords(qc, packageId);
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
    // The words list is invalidated by the caller once the row's exit animation has played
    onSuccess: () => {
      invalidate(qc, queryKeys.games(), queryKeys.dashboard());
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
    // The caller refetches the words once its exit animation has played; marked stale now, so a
    // page left before that does not show the deleted words from the cache
    onSuccess: () => {
      invalidate(qc, queryKeys.games(), queryKeys.dashboard());
      void qc.invalidateQueries({ queryKey: queryKeys.words(packageId), refetchType: 'none' });
    },
  });
}
