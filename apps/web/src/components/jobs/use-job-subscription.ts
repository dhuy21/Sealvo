import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { streamJob } from '@/lib/job-stream';
import { finishJob, jobToastId, type JobOutcome } from '@/lib/job-watcher';
import { notifyInfo } from '@/lib/notify';
import { invalidate, queryKeys } from '@/lib/query-keys';
import { STREAM_UNAVAILABLE_MESSAGE, completedMessage, failedMessage } from './job-messages';

/** Streams one job. Progress refreshes the journal. A toast appears only when the job ends. */
export function useJobSubscription(jobId: string): void {
  const qc = useQueryClient();

  useEffect(() => {
    const controller = new AbortController();
    const toastId = jobToastId(jobId);
    let ended = false;

    const end = (outcome: JobOutcome, keepStored = false) => {
      ended = true;
      controller.abort();
      invalidate(qc, queryKeys.activities());
      if (outcome !== 'lost') {
        invalidate(
          qc,
          queryKeys.allWords(),
          queryKeys.games(),
          queryKeys.dashboard(),
          queryKeys.packages(),
        );
      }
      finishJob(jobId, outcome, keepStored);
    };

    void streamJob(
      jobId,
      (job) => {
        if (ended) return;
        if (job.status === 'processing' || job.status === 'retrying') {
          invalidate(qc, queryKeys.activities());
        }

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
