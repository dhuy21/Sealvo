import { ImportQueueService } from './import-queue.service.js';

describe('ImportQueueService publishing', () => {
  let rabbitmq: { publish: any; onChannelReady: any };
  let service: ImportQueueService;

  beforeEach(() => {
    rabbitmq = { publish: vi.fn(), onChannelReady: vi.fn() };
    service = new ImportQueueService(rabbitmq as any, {} as any, {} as any, {} as any);
  });

  it('asserts its topology on every channel the RabbitMQ service opens', async () => {
    const channel = { assertExchange: vi.fn(), assertQueue: vi.fn(), bindQueue: vi.fn() };
    service.onModuleInit();

    await rabbitmq.onChannelReady.mock.calls[0][0](channel);

    expect(channel.assertExchange).toHaveBeenCalledWith('import.direct', 'direct', {
      durable: true,
    });
    expect(channel.bindQueue).toHaveBeenCalledWith('import.process', 'import.direct', 'import');
  });

  it('reports whether the broker confirmed the job', async () => {
    const payload = { jobId: 'job-1', wordsData: [], packageId: 7, userId: 'u1' };
    rabbitmq.publish.mockResolvedValue(false);

    await expect(service.publish(payload)).resolves.toBe(false);
    expect(rabbitmq.publish).toHaveBeenCalledWith(
      'import.direct',
      'import',
      Buffer.from(JSON.stringify(payload)),
      { persistent: true, contentType: 'application/json' },
    );
  });
});

describe('ImportQueueService consumer', () => {
  let handler: (msg: unknown, ch: unknown) => Promise<void>;
  let channel: { ack: any; nack: any; sendToQueue: any };
  let jobTracker: { update: any };
  let wordsService: { addWords: any };

  const message = (count: number, { redelivered = false, deaths = 0 } = {}) => ({
    content: Buffer.from(
      JSON.stringify({
        jobId: 'job-1',
        wordsData: Array.from({ length: count }, () => ({})),
        packageId: 7,
        userId: 'u1',
      }),
    ),
    properties: {
      headers: deaths ? { 'x-death': [{ queue: 'import.process', reason: 'rejected', count: deaths }] } : {},
    },
    fields: { redelivered },
  });
  const run = (msg: unknown) => handler(msg, channel);
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
    channel = { ack: vi.fn(), nack: vi.fn(), sendToQueue: vi.fn() };
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
      {
        consume: vi.fn((_queue: string, cb: typeof handler) => {
          handler = cb;
        }),
      } as any,
      { del: vi.fn() } as any,
      wordsService as any,
      jobTracker as any,
    );
    await service.startConsumer();
  });

  it('publishes saving progress about every 5% of the words', async () => {
    await run(message(45));

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
    await run(message(3));

    expect(savingUpdates()).toEqual([0, 1, 2, 3]);
  });

  it('completes and acks a redelivered job already applied, without failing it', async () => {
    wordsService.addWords.mockResolvedValue({
      successCount: 3,
      alreadyApplied: true,
    });
    const msg = message(3);

    await run(msg);

    expect(jobTracker.update).toHaveBeenLastCalledWith('job-1', {
      status: 'completed',
      progress: { current: 3, total: 3, phase: 'done' },
      result: { imported: 3, errors: 0, total: 3 },
    });
    expect(channel.ack).toHaveBeenCalledWith(msg);
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('acks a message that is not an import job without processing it', async () => {
    const msg = { content: Buffer.from('{"jobId":"job-1"}'), properties: { headers: {} }, fields: {} };

    await run(msg);

    expect(wordsService.addWords).not.toHaveBeenCalled();
    expect(channel.ack).toHaveBeenCalledWith(msg);
  });

  it('sends an interrupted delivery through the retry queue instead of running it again at once', async () => {
    const msg = message(3, { redelivered: true });

    await run(msg);

    expect(wordsService.addWords).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(msg, false, false);
  });

  it('fails a job interrupted again after its retry (a job that crashes the worker)', async () => {
    const msg = message(3, { redelivered: true, deaths: 1 });

    await run(msg);

    expect(channel.sendToQueue).toHaveBeenCalledWith('import.failed', msg.content, { persistent: true });
    expect(channel.ack).toHaveBeenCalledWith(msg);
    expect(jobTracker.update).toHaveBeenLastCalledWith('job-1', expect.objectContaining({ status: 'failed' }));
  });

  it('writes the final status after every progress update, even slow ones', async () => {
    jobTracker.update.mockImplementation(
      (_id: string, fields: { status?: string }) =>
        new Promise((resolve) => setTimeout(() => resolve(true), fields.status ? 0 : 5)),
    );
    wordsService.addWords.mockImplementation(
      async (_p: number, data: unknown[], { onProgress }: { onProgress: (phase: string, n: number) => Promise<unknown> }) => {
        for (let i = 1; i <= data.length; i++) void onProgress('saving', i);
        return { successCount: data.length, alreadyApplied: false };
      },
    );

    await run(message(3));

    expect(jobTracker.update).toHaveBeenLastCalledWith('job-1', expect.objectContaining({ status: 'completed' }));
  });
});
