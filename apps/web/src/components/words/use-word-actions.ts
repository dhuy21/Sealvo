import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useUpdateWord, useDeleteWord } from '@/hooks/use-words';
import type { UpdateWordPayload } from '@/hooks/use-words';
import { getApiErrorMessage } from '@/lib/api-error';

/** Single-word mutations of the words page, with their toasts. */
export function useWordActions(packageId: number) {
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

  const removeWord = useCallback(
    (detailId: number) => {
      deleteWord.mutate(detailId, {
        onSuccess: () => toast.success('Mot supprimé'),
        onError: (err) => toast.error(getApiErrorMessage(err, 'Erreur')),
      });
    },
    [deleteWord],
  );

  return { saveWord, removeWord };
}
