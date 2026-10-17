import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useDeleteAllWords } from '@/hooks/use-words';
import { useTimeouts } from '@/hooks/use-timeouts';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';
import type { DeleteAllStatus } from './DeleteAllModal';

/**
 * Delete-all modal and exit animation, as in the old app: success state for 1.5s, then a
 * staggered fade-out of the level containers, which stay hidden until the words are refetched.
 */
export function useDeleteAllFlow(packageId: number, levels: string[]) {
  const queryClient = useQueryClient();
  const deleteAll = useDeleteAllWords(packageId);
  const later = useTimeouts();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<DeleteAllStatus>('idle');
  const [deletingLevels, setDeletingLevels] = useState<Set<string>>(new Set());

  const confirm = useCallback(() => {
    setStatus('loading');
    deleteAll.mutate(undefined, {
      onSuccess: (data: { message: string }) => {
        setStatus('success');
        later(() => {
          setOpen(false);
          setStatus('idle');

          levels.forEach((level, i) => {
            later(() => setDeletingLevels((prev) => new Set(prev).add(level)), i * 100);
          });
          later(
            () => {
              // Prefix match: also refreshes the Learn review list and other per-package word queries
              void queryClient
                .invalidateQueries({ queryKey: queryKeys.words(packageId) })
                .then(() => setDeletingLevels(new Set()));
              toast.success(data.message);
            },
            levels.length * 100 + 600,
          );
        }, 1500);
      },
      onError: (err) => {
        setStatus('idle');
        toast.error(
          getApiErrorMessage(err, 'Une erreur est survenue lors de la suppression des mots'),
        );
      },
    });
  }, [deleteAll, later, levels, queryClient, packageId]);

  const openModal = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => setOpen(false), []);

  return { open, status, deletingLevels, openModal, closeModal, confirm };
}
