import { Injectable } from '@nestjs/common';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service.js';
import { WordsService } from '../words/words.service.js';
import type { CreateWordDto } from '../words/dto/create-word.dto.js';
import { ImportQueueService } from './import-queue.service.js';
import { JobTrackerService } from './job-tracker.service.js';

export type BulkJobType = 'import' | 'addWords';

/** Smallest batch handed to the worker; smaller ones are saved during the request */
const QUEUE_THRESHOLD: Record<BulkJobType, number> = { import: 1, addWords: 3 };

const MESSAGES: Record<BulkJobType, { queued: string; saved: (count: number) => string }> = {
  import: {
    queued: 'Import en cours de traitement.',
    saved: (count) => `${count} mot(s) importé(s) avec succès.`,
  },
  addWords: {
    queued: 'Traitement en cours.',
    saved: (count) => `${count} mot(s) ajouté(s) avec succès.`,
  },
};

export type BulkWordsResult =
  | { success: true; jobId: string; async: true; message: string }
  | { success: true; async: false; message: string };

/**
 * Queues words for the worker when RabbitMQ and Redis are available, otherwise saves them
 * synchronously. The result is the response body: HTTP 202 when async, 200 otherwise.
 */
@Injectable()
export class BulkWordsService {
  constructor(
    private readonly rabbitmq: RabbitmqService,
    private readonly jobTracker: JobTrackerService,
    private readonly importQueue: ImportQueueService,
    private readonly wordsService: WordsService,
  ) {}

  async add(
    type: BulkJobType,
    packageId: number,
    userId: string,
    words: CreateWordDto[],
  ): Promise<BulkWordsResult> {
    let jobId: string | undefined;
    if (words.length >= QUEUE_THRESHOLD[type]) {
      const job = await this.enqueue(type, packageId, userId, words);
      if (job?.queued)
        return { success: true, jobId: job.id, async: true, message: MESSAGES[type].queued };
      jobId = job?.id;
    }

    // An unconfirmed publish may still reach the worker: the job id keeps the words from being saved twice
    const { successCount } = await this.wordsService.addWords(packageId, words, { jobId });
    return { success: true, async: false, message: MESSAGES[type].saved(successCount) };
  }

  private async enqueue(
    type: BulkJobType,
    packageId: number,
    userId: string,
    words: CreateWordDto[],
  ): Promise<{ id: string; queued: boolean } | null> {
    if (!this.rabbitmq.getChannel()) return null;

    const job = await this.jobTracker.create(type, {
      packageId: String(packageId),
      userId,
      ...(type === 'addWords' ? { wordCount: words.length } : {}),
    });
    if (!job) return null;

    if (await this.importQueue.publish({ jobId: job.id, wordsData: words, packageId, userId })) {
      return { id: job.id, queued: true };
    }
    await this.jobTracker.remove(job.id);
    return { id: job.id, queued: false };
  }
}
