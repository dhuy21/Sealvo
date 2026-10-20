import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { getFreshStoredJobs } from '@/lib/active-jobs';
import { setWatchedJobs } from '@/lib/job-watcher';

interface ActiveJobsResponse {
  jobs?: { id: string; createdAt?: number }[];
}

/**
 * On load, the server list of the user's active jobs replaces the stored one.
 * Without it, the stored jobs younger than one hour are resumed. Returns true once resolved.
 */
export function useResumeActiveJobs(): boolean {
  const [resumed, setResumed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      let serverJobs: ActiveJobsResponse['jobs'];
      try {
        const { data } = await api.get<ActiveJobsResponse>('/jobs');
        serverJobs = data?.jobs;
      } catch {
        // Fall back to localStorage below.
      }
      if (cancelled) return;
      setWatchedJobs(
        serverJobs
          ? serverJobs.map((j) => ({ id: j.id, ts: j.createdAt || Date.now() }))
          : getFreshStoredJobs(),
      );
      setResumed(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return resumed;
}
