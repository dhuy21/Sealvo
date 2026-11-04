import type { QueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { WordsSubmitResponse } from '@/hooks/use-words';
import api from '@/lib/api';
import { addJob } from '@/lib/job-watcher';
import { notifyLongError } from '@/lib/notify';
import { invalidate, queryKeys } from '@/lib/query-keys';

/** The stream can drop after the worker has already saved the words. */
async function jobCompleted(jobId: string): Promise<boolean> {
  try {
    const { data } = await api.get<{ job?: { status?: string } }>(`/jobs/${jobId}`);
    return data.job?.status === 'completed';
  } catch {
    return false;
  }
}

/**
 * Notifies the outcome of an add/import request. A queued job is handed to the global
 * JobWatcher and awaited. Progress stays in the journal. A toast appears only when the job ends.
 * Resolves true when the form can be reset.
 */
export async function settleWordsResponse(
  result: WordsSubmitResponse,
  messages: { success: string; error: string },
  qc?: QueryClient,
): Promise<boolean> {
  if (!result.success) {
    notifyLongError(result.message || messages.error);
    return false;
  }
  if (!result.async || !result.jobId) {
    toast.success(result.message || messages.success);
    return true;
  }

  const outcome = await addJob(result.jobId);
  switch (outcome) {
    case 'lost':
    case 'unavailable':
      if (await jobCompleted(result.jobId)) {
        // A lost stream does not refresh the word list. The words are already saved.
        if (qc) {
          invalidate(
            qc,
            queryKeys.allWords(),
            queryKeys.games(),
            queryKeys.dashboard(),
            queryKeys.packages(),
          );
        }
        return true;
      }
      if (outcome === 'lost') notifyLongError('Connexion au serveur perdue');
      return false;
    case 'failed':
      return false;
    default:
      return true;
  }
}
