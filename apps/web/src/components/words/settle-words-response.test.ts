import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobOutcome } from '@/lib/job-watcher';

const addJob = vi.fn<(jobId: string) => Promise<JobOutcome>>();

vi.mock('@/lib/job-watcher', () => ({ addJob: (jobId: string) => addJob(jobId) }));
vi.mock('@/lib/notify', () => ({ notifyLongError: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn() } }));

import { settleWordsResponse } from './settle-words-response';

const messages = { success: 'ok', error: 'err' };

beforeEach(() => {
  addJob.mockReset();
});

describe('settleWordsResponse', () => {
  it('keeps the form when the job stream cannot be opened', async () => {
    addJob.mockResolvedValue('unavailable');

    await expect(
      settleWordsResponse({ success: true, async: true, jobId: 'job-1' }, messages),
    ).resolves.toBe(false);
  });

  it('resets the form when the job completes', async () => {
    addJob.mockResolvedValue('completed');

    await expect(
      settleWordsResponse({ success: true, async: true, jobId: 'job-1' }, messages),
    ).resolves.toBe(true);
  });
});
