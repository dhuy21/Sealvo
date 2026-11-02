import { useInfiniteQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export interface ActivityItem {
  id: string;
  type:
    | 'login'
    | 'password_change'
    | 'email_change'
    | 'package_create'
    | 'package_delete'
    | 'import'
    | 'add_words';
  status: 'running' | 'succeeded' | 'failed';
  occurredAt: string;
  packageName: string | null;
  fileName: string | null;
  wordCount: number | null;
  errorCount: number | null;
  phase: 'parsing' | 'gemini' | 'saving' | 'done' | null;
  errorMessage: string | null;
  /** 0–100 while the job is running. Null when there is no bar. */
  percent: number | null;
}

interface ActivitiesPage {
  items: ActivityItem[];
  nextCursor: string | null;
}

export function useActivities() {
  return useInfiniteQuery({
    queryKey: queryKeys.activities(),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<ActivitiesPage>('/activities', {
        params: { cursor: pageParam ?? undefined, limit: 20 },
      });
      return data;
    },
    getNextPageParam: (last) => last.nextCursor,
    // A row is written before the response returns. The dashboard must read it on open,
    // not show the list cached from the previous visit.
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      const running = query.state.data?.pages.some((page) =>
        page.items.some((item) => item.status === 'running'),
      );
      return running ? 3000 : false;
    },
  });
}
