import { BulkWordsService } from './bulk-words.service.js';
import type { RabbitmqService } from '../rabbitmq/rabbitmq.service.js';
import type { JobTrackerService } from './job-tracker.service.js';
import type { ImportQueueService } from './import-queue.service.js';
import type { WordsService } from '../words/words.service.js';
import type { CreateWordDto } from '../words/dto/create-word.dto.js';

const words = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ word: `w${i}` }) as CreateWordDto);

describe('BulkWordsService', () => {
  let rabbitmq: { getChannel: any };
  let jobTracker: { create: any; remove: any };
  let importQueue: { publish: any };
  let wordsService: { addWords: any };
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
    service = new BulkWordsService(
      rabbitmq as unknown as RabbitmqService,
      jobTracker as unknown as JobTrackerService,
      importQueue as unknown as ImportQueueService,
      wordsService as unknown as WordsService,
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
  });

  it('saves fewer than 3 added words synchronously', async () => {
    await expect(service.add('addWords', 7, 'u1', words(2))).resolves.toEqual({
      success: true,
      async: false,
      message: '2 mot(s) ajouté(s) avec succès.',
    });
    expect(jobTracker.create).not.toHaveBeenCalled();
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

  it('removes the job and falls back to a synchronous save when publishing fails', async () => {
    importQueue.publish.mockReturnValue(false);

    await expect(service.add('addWords', 7, 'u1', words(4))).resolves.toEqual({
      success: true,
      async: false,
      message: '4 mot(s) ajouté(s) avec succès.',
    });
    expect(jobTracker.remove).toHaveBeenCalledWith('job-1');
    // The unconfirmed message may still reach the worker: both saves claim the same job
    expect(wordsService.addWords).toHaveBeenCalledWith(7, expect.any(Array), { jobId: 'job-1' });
  });

  it('falls back to a synchronous save without RabbitMQ or when the job cannot be created', async () => {
    rabbitmq.getChannel.mockReturnValue(null);
    await expect(service.add('import', 7, 'u1', words(3))).resolves.toEqual({
      success: true,
      async: false,
      message: '3 mot(s) importé(s) avec succès.',
    });

    rabbitmq.getChannel.mockReturnValue({});
    jobTracker.create.mockResolvedValue(null);
    await expect(service.add('import', 7, 'u1', words(3))).resolves.toMatchObject({ async: false });
    expect(importQueue.publish).not.toHaveBeenCalled();
  });
});
