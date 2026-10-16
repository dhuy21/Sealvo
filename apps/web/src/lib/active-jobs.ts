/** Jobs the watcher follows, kept across reloads in `localStorage` (same key and shape as the old app). */
export interface StoredJob {
  id: string;
  ts: number;
}

const STORAGE_KEY = 'activeJobs';
const MAX_AGE_MS = 3_600_000;

export function getStoredJobs(): StoredJob[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as StoredJob[]) : [];
  } catch {
    return [];
  }
}

export function saveStoredJobs(jobs: StoredJob[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  } catch {
    // Storage can be full or disabled; the server list (GET /jobs) still resumes jobs.
  }
}

export function addStoredJob(jobId: string): void {
  const jobs = getStoredJobs().filter((j) => j.id !== jobId);
  jobs.push({ id: jobId, ts: Date.now() });
  saveStoredJobs(jobs);
}

export function removeStoredJob(jobId: string): void {
  saveStoredJobs(getStoredJobs().filter((j) => j.id !== jobId));
}

/** Stored jobs younger than one hour (the server job TTL). Older entries are dropped from storage. */
export function getFreshStoredJobs(): StoredJob[] {
  const jobs = getStoredJobs();
  const oneHourAgo = Date.now() - MAX_AGE_MS;
  const fresh = jobs.filter((j) => j.ts > oneHourAgo);
  if (fresh.length !== jobs.length) saveStoredJobs(fresh);
  return fresh;
}
