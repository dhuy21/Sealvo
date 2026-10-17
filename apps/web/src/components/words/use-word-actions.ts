import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useUpdateWord, useDeleteWord } from '@/hooks/use-words';
import type { UpdateWordPayload } from '@/hooks/use-words';
import { getApiErrorMessage } from '@/lib/api-error';
import { invalidate, queryKeys } from '@/lib/query-keys';

/** `.row-deleted` animation in vocabs.module.css */
const ROW_DELETED_ANIMATION_MS = 800;

/** Single-word mutations of the words page, with their toasts. */
export function useWordActions(packageId: number) {
  const qc = useQueryClient();
  const updateWord = useUpdateWord(packageId);
  const deleteWord = useDeleteWord(packageId);

  /** Resolves to whether the word was saved. */
  const saveWord = useCallback(
    async (detailId: number, dto: UpdateWordPayload): Promise<boolean> => {
      try {
        await updateWord.mutateAsync({ detailId, dto });
        toast.success('Mot modifié avec succès');
        return true;
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Erreur lors de la modification du mot'));
        return false;
      }
    },
    [updateWord],
  );

  /** Resolves to whether the word was deleted; its row leaves the list once it has faded out. */
  const removeWord = useCallback(
    async (detailId: number): Promise<boolean> => {
      try {
        await deleteWord.mutateAsync(detailId);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Erreur'));
        return false;
      }
      toast.success('Mot supprimé');
      // Not cancelled on unmount: the cached list must lose the word even if the page is left
      setTimeout(() => invalidate(qc, queryKeys.words(packageId)), ROW_DELETED_ANIMATION_MS);
      return true;
    },
    [deleteWord, qc, packageId],
  );

  return { saveWord, removeWord };
}
