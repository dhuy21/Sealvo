import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { streamJob } from '@/lib/job-stream';
import { finishJob, type JobOutcome } from '@/lib/job-watcher';
import { notifyInfo } from '@/lib/notify';
import {
  STREAM_UNAVAILABLE_MESSAGE,
  completedMessage,
  failedMessage,
  progressMessage,
} from './job-messages';

/** Streams one job: a single toast per job updated in place, data refetched when it ends. */
export function useJobSubscription(jobId: string): void {
  const qc = useQueryClient();

  useEffect(() => {
    const controller = new AbortController();
    const toastId = `job-${jobId}`;
    let ended = false;

    const end = (outcome: JobOutcome, keepStored = false) => {
      ended = true;
      controller.abort();
      if (outcome !== 'lost') {
        void qc.invalidateQueries({ queryKey: ['words'] });
        void qc.invalidateQueries({ queryKey: ['dashboard'] });
        void qc.invalidateQueries({ queryKey: ['packages'] });
      }
      finishJob(jobId, outcome, keepStored);
    };

    void streamJob(
      jobId,
      (job) => {
        if (ended) return;
        const progress = progressMessage(job);
        if (progress) toast.loading(progress, { id: toastId });

        if (job.status === 'completed') {
          toast.success(completedMessage(job), { id: toastId });
          end('completed');
        } else if (job.status === 'failed') {
          toast.error(failedMessage(job), { id: toastId });
          end('failed');
        } else if (job.status === 'stream_unavailable') {
          notifyInfo(STREAM_UNAVAILABLE_MESSAGE, toastId);
          end('unavailable');
        }
      },
      controller.signal,
    ).then((streamEnd) => {
      if (ended || controller.signal.aborted) return;
      toast.dismiss(toastId);
      // A job that is gone will never stream; a lost connection is retried on the next page load.
      end('lost', streamEnd !== 'gone');
    });

    return () => controller.abort();
  }, [jobId, qc]);
}
