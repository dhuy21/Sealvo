import { BulkWordsService } from './bulk-words.service.js';
import type { RabbitmqService } from '../rabbitmq/rabbitmq.service.js';
import type { JobTrackerService } from './job-tracker.service.js';
import type { ImportQueueService } from './import-queue.service.js';
import type { WordsService } from '../words/words.service.js';
import type { CreateWordDto } from '../words/dto/create-word.dto.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { ActivityLogService } from '../activity/activity-log.service.js';
import type { ImportOutboxService } from './import-outbox.service.js';

const words = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ word: `w${i}` }) as CreateWordDto);

describe('BulkWordsService', () => {
  let rabbitmq: { getChannel: any };
  let jobTracker: { create: any; remove: any };
  let importQueue: { publish: any };
  let wordsService: { addWords: any };
  let activities: { start: any; recordFinished: any; recordImportFailed: any; discard: any };
  let outbox: { add: any; remove: any };
  let service: BulkWordsService;

  beforeEach(() => {
    rabbitmq = { getChannel: vi.fn().mockReturnValue({}) };
    jobTracker = { create: vi.fn().mockResolvedValue({ id: 'job-1' }), remove: vi.fn() };
    importQueue = { publish: vi.fn().mockReturnValue(true) };
    wordsService = {
      addWords: vi.fn((_packageId: number, data: unknown[]) =>
        Promise.resolve({ successCount: data.length }),
      ),
    };
    activities = {
      start: vi.fn(),
      recordFinished: vi.fn().mockResolvedValue(undefined),
      recordImportFailed: vi.fn(),
      discard: vi.fn(),
    };
    outbox = {
      add: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const prisma = {
      packages: { findUnique: vi.fn().mockResolvedValue({ package_name: 'Animals' }) },
      $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn({})),
    };
    service = new BulkWordsService(
      rabbitmq as unknown as RabbitmqService,
      jobTracker as unknown as JobTrackerService,
      importQueue as unknown as ImportQueueService,
      wordsService as unknown as WordsService,
      prisma as unknown as PrismaService,
      activities as unknown as ActivityLogService,
      outbox as unknown as ImportOutboxService,
    );
  });

  it('queues 3 added words or more as an addWords job', async () => {
    const data = words(3);

    await expect(service.add('addWords', 7, 'u1', data)).resolves.toEqual({
      success: true,
      jobId: 'job-1',
      async: true,
      message: 'Traitement en cours.',
    });
    expect(jobTracker.create).toHaveBeenCalledWith('addWords', {
      packageId: '7',
      userId: 'u1',
      wordCount: 3,
    });
    expect(importQueue.publish).toHaveBeenCalledWith({
      jobId: 'job-1',
      wordsData: data,
      packageId: 7,
      userId: 'u1',
    });
    expect(wordsService.addWords).not.toHaveBeenCalled();
    expect(activities.start).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'add_words',
        jobId: 'job-1',
        wordCount: 3,
        packageName: 'Animals',
      }),
      expect.anything(),
    );
    expect(outbox.add.mock.invocationCallOrder[0]).toBeLessThan(
      importQueue.publish.mock.invocationCallOrder[0],
    );
    expect(outbox.remove).toHaveBeenCalledWith('job-1');
    expect(activities.recordFinished).not.toHaveBeenCalled();
  });

  it('saves fewer than 3 added words synchronously', async () => {
    await expect(service.add('addWords', 7, 'u1', words(2))).resolves.toEqual({
      success: true,
      async: false,
      message: '2 mot(s) ajouté(s) avec succès.',
    });
    expect(jobTracker.create).not.toHaveBeenCalled();
    expect(activities.recordFinished).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'add_words', wordCount: 2, packageName: 'Animals' }),
    );
    expect(activities.start).not.toHaveBeenCalled();
  });

  it('still reports a synchronous save when the journal line cannot be written', async () => {
    activities.recordFinished.mockRejectedValue(new Error('journal down'));

    await expect(service.add('addWords', 7, 'u1', words(2))).resolves.toEqual({
      success: true,
      async: false,
      message: '2 mot(s) ajouté(s) avec succès.',
    });
    expect(wordsService.addWords).toHaveBeenCalledTimes(1);
  });

  it('queues any import, without wordCount in the job meta', async () => {
    await expect(service.add('import', 7, 'u1', words(1))).resolves.toEqual({
      success: true,
      jobId: 'job-1',
      async: true,
      message: 'Import en cours de traitement.',
    });
    expect(jobTracker.create).toHaveBeenCalledWith('import', { packageId: '7', userId: 'u1' });
  });

  it('keeps the words in the outbox when publishing is not confirmed', async () => {
    importQueue.publish.mockReturnValue(false);

    await expect(service.add('addWords', 7, 'u1', words(4))).resolves.toEqual({
      success: true,
      async: true,
      jobId: 'job-1',
      message: 'Traitement en cours.',
    });
    expect(outbox.add).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'job-1', wordCount: 4 }),
      expect.anything(),
    );
    expect(outbox.remove).not.toHaveBeenCalled();
    expect(wordsService.addWords).not.toHaveBeenCalled();
    expect(activities.discard).not.toHaveBeenCalled();
  });

  it('keeps the words in the outbox when publishing throws', async () => {
    importQueue.publish.mockRejectedValue(new Error('broker down'));

    await expect(service.add('import', 7, 'u1', words(2))).resolves.toMatchObject({
      async: true,
      jobId: 'job-1',
    });
    expect(outbox.add).toHaveBeenCalled();
    expect(wordsService.addWords).not.toHaveBeenCalled();
  });

  it('stores the job without publishing when RabbitMQ is down', async () => {
    rabbitmq.getChannel.mockReturnValue(null);
    await expect(service.add('import', 7, 'u1', words(3))).resolves.toMatchObject({
      async: true,
      jobId: 'job-1',
    });
    expect(importQueue.publish).not.toHaveBeenCalled();
    expect(outbox.add).toHaveBeenCalled();
    expect(wordsService.addWords).not.toHaveBeenCalled();
  });

  it('still accepts the job when Redis cannot store it', async () => {
    jobTracker.create.mockResolvedValue(null);
    importQueue.publish.mockReturnValue(false);

    const result = await service.add('import', 7, 'u1', words(3));

    expect(result.async).toBe(true);
    expect(result).toMatchObject({ success: true });
    expect(outbox.add).toHaveBeenCalled();
    expect(wordsService.addWords).not.toHaveBeenCalled();
  });
});
