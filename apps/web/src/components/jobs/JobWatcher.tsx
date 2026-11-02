'use client';

import { useAuthStore } from '@/stores/auth.store';
import { useWatchedJobs } from '@/lib/job-watcher';
import { useJobSubscription } from './use-job-subscription';
import { useResumeActiveJobs } from './use-resume-active-jobs';

function JobSubscription({ jobId }: { jobId: string }) {
  useJobSubscription(jobId);
  return null;
}

function ActiveJobs() {
  const resumed = useResumeActiveJobs();
  const jobIds = useWatchedJobs((s) => s.jobIds);
  if (!resumed) return null;
  return jobIds.map((id) => <JobSubscription key={id} jobId={id} />);
}

/** Follows import / bulk-add jobs on every page while signed in. Unmounting aborts every stream. */
export function JobWatcher() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <ActiveJobs /> : null;
}
