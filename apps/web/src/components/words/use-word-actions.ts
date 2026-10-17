import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useUpdateWord, useDeleteWord } from '@/hooks/use-words';
import type { UpdateWordPayload } from '@/hooks/use-words';
import { getApiErrorMessage } from '@/lib/api-error';

/** Single-word mutations of the words page, with their toasts. */
export function useWordActions(packageId: number) {
  const updateWord = useUpdateWord(packageId);
  const deleteWord = useDeleteWord(packageId);

  const saveWord = useCallback(
    (detailId: number, dto: UpdateWordPayload) => {
      updateWord.mutate(
        { detailId, dto },
        {
          onSuccess: () => toast.success('Mot modifié avec succès'),
          onError: (err) => toast.error(getApiErrorMessage(err, 'Erreur')),
        },
      );
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

  return { saveWord, removeWord, savePending: updateWord.isPending };
}
