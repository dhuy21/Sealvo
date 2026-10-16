import toast from 'react-hot-toast';
import type { WordsSubmitResponse } from '@/hooks/use-words';
import { addJob } from '@/lib/job-watcher';
import { notifyInfo, notifyLongError } from '@/lib/notify';

/**
 * Notifies the outcome of an add/import request. A queued job is handed to the global
 * JobWatcher (which shows its progress and result) and awaited.
 * Resolves true when the form can be reset.
 */
export async function settleWordsResponse(
  result: WordsSubmitResponse,
  messages: { success: string; error: string },
): Promise<boolean> {
  if (!result.success) {
    notifyLongError(result.message || messages.error);
    return false;
  }
  if (!result.async || !result.jobId) {
    toast.success(result.message || messages.success);
    return true;
  }

  const outcome = addJob(result.jobId);
  notifyInfo('Traitement en cours...');
  switch (await outcome) {
    case 'lost':
      notifyLongError('Connexion au serveur perdue');
      return false;
    case 'failed':
      return false;
    default:
      return true;
  }
}
