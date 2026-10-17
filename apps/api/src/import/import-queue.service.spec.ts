import { ImportQueueService } from './import-queue.service.js';

describe('ImportQueueService consumer', () => {
  let handler: (msg: unknown) => Promise<void>;
  let channel: { consume: any; ack: any; nack: any; sendToQueue: any };
  let jobTracker: { update: any };
  let wordsService: { addWords: any };

  const message = (count: number) => ({
    content: Buffer.from(
      JSON.stringify({
        jobId: 'job-1',
        wordsData: Array.from({ length: count }, () => ({})),
        packageId: 7,
        userId: 'u1',
      }),
    ),
    properties: { headers: {} },
  });
  const savingUpdates = () =>
    jobTracker.update.mock.calls
      .map(
        ([, fields]: [
          string,
          { progress?: { phase: string; current: number } },
        ]) => fields.progress,
      )
      .filter((p: { phase: string } | undefined) => p?.phase === 'saving')
      .map((p: { current: number }) => p.current);

  beforeEach(async () => {
    channel = {
      consume: vi.fn((_queue, cb) => {
        handler = cb;
      }),
      ack: vi.fn(),
      nack: vi.fn(),
      sendToQueue: vi.fn(),
    };
    jobTracker = { update: vi.fn().mockResolvedValue(true) };
    wordsService = {
      addWords: vi.fn(
        async (_packageId: number, data: unknown[], { onProgress }) => {
          await onProgress('gemini', 0);
          for (let i = 0; i <= data.length; i++) await onProgress('saving', i);
          return { successCount: data.length, alreadyApplied: false };
        },
      ),
    };

    const service = new ImportQueueService(
      { createChannel: vi.fn().mockResolvedValue(channel) } as any,
      { del: vi.fn() } as any,
      wordsService as any,
      jobTracker as any,
    );
    await service.startConsumer();
  });

  it('publishes saving progress about every 5% of the words', async () => {
    await handler(message(45));

    expect(wordsService.addWords).toHaveBeenCalledWith(
      7,
      expect.any(Array),
      expect.objectContaining({ jobId: 'job-1' }),
    );
    expect(savingUpdates()).toEqual([
      0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38,
      40, 42, 44, 45,
    ]);
    expect(jobTracker.update).toHaveBeenCalledWith('job-1', {
      progress: { current: 0, total: 45, phase: 'gemini' },
    });
  });

  it('publishes every word of a small import', async () => {
    await handler(message(3));

    expect(savingUpdates()).toEqual([0, 1, 2, 3]);
  });

  it('completes and acks a redelivered job already applied, without failing it', async () => {
    wordsService.addWords.mockResolvedValue({
      successCount: 3,
      alreadyApplied: true,
    });
    const msg = message(3);

    await handler(msg);

    expect(jobTracker.update).toHaveBeenLastCalledWith('job-1', {
      status: 'completed',
      progress: { current: 3, total: 3, phase: 'done' },
      result: { imported: 3, errors: 0, total: 3 },
    });
    expect(channel.ack).toHaveBeenCalledWith(msg);
    expect(channel.nack).not.toHaveBeenCalled();
  });
});
