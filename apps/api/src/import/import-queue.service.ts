import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service.js';
import { RetryQueue } from '../rabbitmq/retry-queue.js';
import { CacheService } from '../redis/cache.service.js';
import { WordsService } from '../words/words.service.js';
import { JobTrackerService } from './job-tracker.service.js';
import { CACHE_KEYS } from '../redis/cache-keys.constants.js';
import type { CreateWordDto } from '../words/dto/create-word.dto.js';
import { errorMessage } from '../common/utils/error-message.js';

const QUEUE = new RetryQueue({
  name: 'import',
  queue: 'import.process',
  retryTtl: 30_000,
  maxRetries: 1,
});

export interface ImportPayload {
  jobId: string;
  wordsData: CreateWordDto[];
  packageId: number;
  userId: string;
}

const isImportPayload = (value: unknown): value is ImportPayload => {
  const payload = value as Partial<ImportPayload> | null;
  return (
    typeof payload?.jobId === 'string' &&
    typeof payload.userId === 'string' &&
    Number.isInteger(payload.packageId) &&
    Array.isArray(payload.wordsData)
  );
};

@Injectable()
export class ImportQueueService implements OnModuleInit {
  private readonly logger = new Logger(ImportQueueService.name);

  constructor(
    private readonly rabbitmq: RabbitmqService,
    private readonly cache: CacheService,
    private readonly wordsService: WordsService,
    private readonly jobTracker: JobTrackerService,
  ) {}

  onModuleInit() {
    this.rabbitmq.onChannelReady(async (ch) => {
      await QUEUE.assertTopology(ch);
      this.logger.log('Topology ready.');
    });
  }

  /** False unless the broker confirmed the job */
  publish(payload: ImportPayload): Promise<boolean> {
    return this.rabbitmq.publish(
      QUEUE.exchange,
      QUEUE.routingKey,
      Buffer.from(JSON.stringify(payload)),
      {
        persistent: true,
        contentType: 'application/json',
      },
    );
  }

  /** Start consuming import jobs (called in worker process) */
  async startConsumer(): Promise<void> {
    await this.rabbitmq.consume(QUEUE.queue, (msg, ch) => this.handle(msg, ch));
    this.logger.log('Consumer started — waiting for import jobs.');
  }

  private async handle(msg: ConsumeMessage, ch: ConfirmChannel): Promise<void> {
    let payload: unknown;
    try {
      payload = JSON.parse(msg.content.toString());
    } catch {
      payload = null;
    }
    if (!isImportPayload(payload)) {
      this.logger.warn('Discarding a message that is not an import job.');
      return ch.ack(msg);
    }

    const { jobId, wordsData, packageId, userId } = payload;
    const total = wordsData.length;

    // A redelivery means the previous attempt never finished (the worker stopped or crashed on it):
    // it goes through the retry queue so that a job crashing the worker is attempted a bounded number of times.
    // Unless it stopped after its transaction committed: then the words are saved.
    if (msg.fields.redelivered) {
      if (await this.wordsService.isJobApplied(jobId)) {
        await this.complete(jobId, userId, total, total);
        return ch.ack(msg);
      }
      this.logger.warn(`Job ${jobId} was interrupted — counting it as a failed attempt.`);
      return this.fail(msg, ch, jobId, new Error('Traitement interrompu.'));
    }

    // Publish saving progress about every 5%
    const step = Math.max(1, Math.floor(total / 20));
    // update() rewrites the whole job: one at a time, so a late progress never overwrites the final status
    let progress = Promise.resolve();
    const report = (fields: Parameters<JobTrackerService['update']>[1]) => {
      progress = progress.then(() => this.jobTracker.update(jobId, fields)).then(() => undefined);
      return progress;
    };

    try {
      await report({ status: 'processing', progress: { current: 0, total, phase: 'parsing' } });

      // Reuse WordsService.addWords (Gemini enrichment + find-or-create + transaction)
      const result = await this.wordsService.addWords(packageId, wordsData, {
        jobId,
        onProgress: (phase, current) =>
          current % step === 0 || current === total
            ? report({ progress: { current, total, phase } })
            : Promise.resolve(),
      });
      if (result.alreadyApplied) {
        this.logger.warn(
          `Job ${jobId} was already applied by an earlier delivery — not saving again.`,
        );
      }

      await progress;
      await this.complete(jobId, userId, total, result.successCount);
      ch.ack(msg);
      this.logger.log(`Job ${jobId} completed: ${result.successCount} imported.`);
    } catch (err) {
      this.logger.error(`Job ${jobId} failed: ${errorMessage(err)}`);
      await progress;
      await this.fail(msg, ch, jobId, err);
    }
  }

  private async complete(jobId: string, userId: string, total: number, imported: number) {
    await this.jobTracker.update(jobId, {
      status: 'completed',
      progress: { current: total, total, phase: 'done' },
      result: { imported, errors: total - imported, total },
    });
    await this.cache.del(CACHE_KEYS.dashboard(userId));
  }

  /** Retries once through the retry queue, then parks the job in the failed queue */
  private async fail(
    msg: ConsumeMessage,
    ch: ConfirmChannel,
    jobId: string,
    err: unknown,
  ): Promise<void> {
    const status = QUEUE.exhausted(msg) ? 'failed' : 'retrying';
    await this.jobTracker.update(jobId, { status, error: errorMessage(err) });
    QUEUE.reject(msg, ch);
  }
}
