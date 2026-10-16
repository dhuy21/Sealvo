import { Injectable } from '@nestjs/common';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service.js';
import { WordsService } from '../words/words.service.js';
import type { CreateWordDto } from '../words/dto/create-word.dto.js';
import { ImportQueueService } from './import-queue.service.js';
import { JobTrackerService } from './job-tracker.service.js';

export type BulkJobType = 'import' | 'addWords';

/** Smallest batch handed to the worker; smaller ones are saved during the request */
const QUEUE_THRESHOLD: Record<BulkJobType, number> = { import: 1, addWords: 3 };

export type BulkWordsResult = { async: true; jobId: string } | { async: false; imported: number };

/**
 * Queues words for the worker when RabbitMQ and Redis are available, otherwise saves them
 * synchronously. Source: services/importFile.js importWords() + WordController.js addWord()
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
    if (words.length >= QUEUE_THRESHOLD[type]) {
      const jobId = await this.enqueue(type, packageId, userId, words);
      if (jobId) return { async: true, jobId };
    }

    const { successCount } = await this.wordsService.addWords(packageId, words);
    return { async: false, imported: successCount };
  }

  private async enqueue(
    type: BulkJobType,
    packageId: number,
    userId: string,
    words: CreateWordDto[],
  ): Promise<string | null> {
    if (!this.rabbitmq.getChannel()) return null;

    const job = await this.jobTracker.create(type, {
      packageId: String(packageId),
      userId,
      ...(type === 'addWords' ? { wordCount: words.length } : {}),
    });
    if (!job) return null;

    if (this.importQueue.publish({ jobId: job.id, wordsData: words, packageId, userId })) {
      return job.id;
    }
    await this.jobTracker.remove(job.id);
    return null;
  }
}
