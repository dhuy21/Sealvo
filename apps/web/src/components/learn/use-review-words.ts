import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Word } from '@/hooks/use-words';

export interface ReviewWord extends Word {
  dueToday: boolean;
}

/** All words of the package, flagged `dueToday` by spaced repetition, with `**` markers stripped from examples. */
export function useReviewWords(packageId: number | null) {
  return useQuery({
    queryKey: ['words', packageId, 'review'],
    queryFn: async () => {
      const { data } = await api.get<ReviewWord[]>(`/packages/${packageId}/words/review`);
      return data.map((w) => ({
        ...w,
        example: (w.example || '').replace(/\*\*([^*]+)\*\*/g, '$1'),
      }));
    },
    enabled: !!packageId,
  });
}
