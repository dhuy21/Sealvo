import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source';
import api, { renewAccessToken } from './api';
import { useAuthStore } from '@/stores/auth.store';

/** A `data:` message of GET /jobs/:id/stream. */
export interface JobUpdate {
  id?: string;
  status: 'pending' | 'processing' | 'retrying' | 'completed' | 'failed' | 'stream_unavailable';
  progress?: { current: number; total: number; phase: string } | null;
  result?: { imported?: number; total?: number; errors?: number } | null;
  error?: string | null;
}

/** Why the stream stopped. `gone`: the job does not exist or belongs to someone else (404/403). */
export type StreamEnd = 'closed' | 'gone' | 'lost';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

class StopStream extends Error {
  constructor(readonly end: 'gone' | 'lost') {
    super(end);
  }
}

class RetryNow extends Error {}

/**
 * Streams a job with the in-memory Bearer token (native EventSource cannot send headers).
 * A 401 refreshes the token once per attempt; retries are capped. Resolves when the server
 * ends the stream or `signal` aborts.
 */
export async function streamJob(
  jobId: string,
  onUpdate: (job: JobUpdate) => void,
  signal: AbortSignal,
): Promise<StreamEnd> {
  let retries = 0;
  try {
    await fetchEventSource(`${api.defaults.baseURL}/jobs/${encodeURIComponent(jobId)}/stream`, {
      signal,
      openWhenHidden: true,
      // Read the token on every attempt so a reconnect after a refresh uses the new one.
      fetch: (input, init) => {
        const token = useAuthStore.getState().accessToken;
        const headers = { ...(init?.headers as Record<string, string> | undefined) };
        if (token) headers.Authorization = `Bearer ${token}`;
        return fetch(input, { ...init, headers });
      },
      async onopen(res) {
        if (res.ok && res.headers.get('content-type')?.startsWith(EventStreamContentType)) return;
        if (res.status === 401) {
          if (await renewAccessToken()) throw new RetryNow();
          throw new StopStream('lost');
        }
        if (res.status === 403 || res.status === 404) throw new StopStream('gone');
        throw new Error(`Job stream HTTP ${res.status}`);
      },
      onmessage(ev) {
        if (!ev.data) return;
        try {
          onUpdate(JSON.parse(ev.data) as JobUpdate);
        } catch (err) {
          console.error('[jobWatcher] SSE parse error:', err);
        }
      },
      onerror(err) {
        if (err instanceof StopStream) throw err;
        retries += 1;
        if (retries > MAX_RETRIES) throw new StopStream('lost');
        return err instanceof RetryNow ? 0 : RETRY_DELAY_MS;
      },
    });
    return 'closed';
  } catch (err) {
    if (err instanceof StopStream) return err.end;
    return 'lost';
  }
}
