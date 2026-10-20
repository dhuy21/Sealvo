import { create } from 'zustand';
import { addStoredJob, removeStoredJob, saveStoredJobs, type StoredJob } from './active-jobs';

/** How a watched job ended. `lost`: the stream stopped before a final status arrived. */
export type JobOutcome = 'completed' | 'failed' | 'unavailable' | 'lost';

/** Ids the global `JobWatcher` is streaming. */
export const useWatchedJobs = create<{ jobIds: string[] }>(() => ({ jobIds: [] }));

const waiters = new Map<string, Array<(outcome: JobOutcome) => void>>();

/** One toast per job. Callers and the watcher update this id in place. */
export function jobToastId(jobId: string): string {
  return `job-${jobId}`;
}

/** Hands a server job (`{ async: true, jobId }`) to the global watcher. Resolves when it ends. */
export function addJob(jobId: string): Promise<JobOutcome> {
  addStoredJob(jobId);
  useWatchedJobs.setState((s) => (s.jobIds.includes(jobId) ? s : { jobIds: [...s.jobIds, jobId] }));
  return new Promise((resolve) => {
    waiters.set(jobId, [...(waiters.get(jobId) ?? []), resolve]);
  });
}

/**
 * Replaces the watched list, e.g. with the server's active jobs after a reload.
 * Jobs a page is still awaiting are kept.
 */
export function setWatchedJobs(jobs: StoredJob[]): void {
  const awaited = [...waiters.keys()]
    .filter((id) => !jobs.some((j) => j.id === id))
    .map((id) => ({ id, ts: Date.now() }));
  const all = [...jobs, ...awaited];
  saveStoredJobs(all);
  useWatchedJobs.setState({ jobIds: all.map((j) => j.id) });
}

/**
 * Stops watching a job and settles `addJob` callers.
 * `keepStored` leaves it in localStorage so the next page load tries again.
 */
export function finishJob(jobId: string, outcome: JobOutcome, keepStored = false): void {
  if (!keepStored) removeStoredJob(jobId);
  useWatchedJobs.setState((s) => ({ jobIds: s.jobIds.filter((id) => id !== jobId) }));
  waiters.get(jobId)?.forEach((resolve) => resolve(outcome));
  waiters.delete(jobId);
}
