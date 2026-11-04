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
  useResumeActiveJobs();
  const jobIds = useWatchedJobs((s) => s.jobIds);
  // A job added while GET /jobs is still open must stream at once. The form waits
  // on that stream. The server list still replaces stored jobs when it arrives.
  return jobIds.map((id) => <JobSubscription key={id} jobId={id} />);
}

/** Follows import / bulk-add jobs on every page while signed in. Unmounting aborts every stream. */
export function JobWatcher() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <ActiveJobs /> : null;
}
