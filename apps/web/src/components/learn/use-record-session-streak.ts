import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useRecordStreak } from '@/hooks/use-learning';

/** Records today's activity for the streak once every card of the session is "Appris". */
export function useRecordSessionStreak() {
  const recordStreak = useRecordStreak();
  const { mutate } = recordStreak;

  return useCallback(
    (known: number, total: number) => {
      const summary = `${known}/${total} mots maîtrisés`;
      const showSessionDone = () =>
        toast.success(`Session terminée ! ${summary}`, { duration: 5000 });
      mutate(undefined, {
        onSuccess: (data) => {
          if (data.updated) {
            toast.success(`🔥 Série de ${data.streak} jour(s) !\n${summary}`, {
              duration: 6000,
              style: { whiteSpace: 'pre-line' },
            });
          } else {
            showSessionDone();
          }
        },
        onError: showSessionDone,
      });
    },
    [mutate],
  );
}
