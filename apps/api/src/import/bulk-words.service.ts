import { Injectable } from '@nestjs/common';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service.js';
import { WordsService } from '../words/words.service.js';
import type { CreateWordDto } from '../words/dto/create-word.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityLogService } from '../activity/activity-log.service.js';
import { IMPORT_FAILED_MESSAGE, ImportQueueService } from './import-queue.service.js';
import { ImportOutboxService } from './import-outbox.service.js';
import { JobTrackerService } from './job-tracker.service.js';
import { randomUUID } from 'crypto';

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
 * Queues words for the worker. If the broker does not confirm, the words wait in MySQL
 * until the worker can publish them. Fewer than 3 added words are saved in the request.
 */
@Injectable()
export class BulkWordsService {
  constructor(
    private readonly rabbitmq: RabbitmqService,
    private readonly jobTracker: JobTrackerService,
    private readonly importQueue: ImportQueueService,
    private readonly wordsService: WordsService,
    private readonly prisma: PrismaService,
    private readonly activities: ActivityLogService,
    private readonly outbox: ImportOutboxService,
  ) {}

  async add(
    type: BulkJobType,
    packageId: number,
    userId: string,
    words: CreateWordDto[],
    fileName?: string,
  ): Promise<BulkWordsResult> {
    const pkg = await this.prisma.packages.findUnique({
      where: { package_id: packageId },
      select: { package_name: true },
    });
    const packageName = pkg?.package_name ?? null;

    if (words.length >= QUEUE_THRESHOLD[type]) {
      return this.enqueue(type, packageId, userId, packageName, words, fileName);
    }

    try {
      const { successCount } = await this.wordsService.addWords(packageId, words);
      // The words are already committed. A failed journal line must not make the client retry them.
      await this.activities
        .recordFinished({
          userId,
          type: type === 'import' ? 'import' : 'add_words',
          packageId,
          packageName,
          fileName,
          wordCount: successCount,
        })
        .catch(() => undefined);
      return { success: true, async: false, message: MESSAGES[type].saved(successCount) };
    } catch (err) {
      if (type === 'import') {
        await this.activities
          .recordImportFailed({
            userId,
            packageId,
            packageName,
            fileName,
            wordCount: words.length,
            errorMessage: IMPORT_FAILED_MESSAGE,
          })
          .catch(() => undefined);
      }
      throw err;
    }
  }

  /**
   * Accepts the job now. Words are saved by the worker after RabbitMQ confirms the message.
   * Until then they sit in `import_outbox`.
   */
  private async enqueue(
    type: BulkJobType,
    packageId: number,
    userId: string,
    packageName: string | null,
    words: CreateWordDto[],
    fileName?: string,
  ): Promise<BulkWordsResult> {
    const opened = await this.openJob(type, packageId, userId, words);
    const activityType = type === 'import' ? 'import' : 'add_words';
    // Journal and outbox commit together. A crash before publish still leaves a row the worker can send.
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.activities.start(
          {
            userId,
            type: activityType,
            packageId,
            packageName,
            fileName,
            wordCount: words.length,
            jobId: opened.id,
          },
          tx,
        );
        await this.outbox.add(
          {
            jobId: opened.id,
            userId,
            packageId,
            type,
            fileName,
            wordCount: words.length,
            words,
          },
          tx,
        );
      });
    } catch (err) {
      if (opened.inRedis) await this.jobTracker.remove(opened.id);
      throw err;
    }

    const published = await this.tryPublish({
      jobId: opened.id,
      wordsData: words,
      packageId,
      userId,
    });
    if (published) await this.outbox.remove(opened.id).catch(() => undefined);

    return { success: true, jobId: opened.id, async: true, message: MESSAGES[type].queued };
  }

  private async tryPublish(payload: {
    jobId: string;
    wordsData: CreateWordDto[];
    packageId: number;
    userId: string;
  }): Promise<boolean> {
    if (!this.rabbitmq.getChannel()) return false;
    try {
      return await this.importQueue.publish(payload);
    } catch {
      return false;
    }
  }

  /** A Redis job when possible, so the browser can follow it. Otherwise a durable id. */
  private async openJob(
    type: BulkJobType,
    packageId: number,
    userId: string,
    words: CreateWordDto[],
  ): Promise<{ id: string; inRedis: boolean }> {
    const job = await this.jobTracker.create(type, {
      packageId: String(packageId),
      userId,
      ...(type === 'addWords' ? { wordCount: words.length } : {}),
    });
    return job ? { id: job.id, inRedis: true } : { id: randomUUID(), inRedis: false };
  }
}
