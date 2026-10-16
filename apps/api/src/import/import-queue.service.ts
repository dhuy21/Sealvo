import { Injectable, Logger } from '@nestjs/common';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service.js';
import { CacheService } from '../redis/cache.service.js';
import { WordsService } from '../words/words.service.js';
import { JobTrackerService } from './job-tracker.service.js';
import { CACHE_KEYS } from '../redis/cache-keys.constant.js';
import type { CreateWordDto } from '../words/dto/create-word.dto.js';

const EXCHANGE = 'import.direct';
const RETRY_EXCHANGE = 'import.retry.direct';
const QUEUE = 'import.process';
const RETRY_QUEUE = 'import.retry';
const FAILED_QUEUE = 'import.failed';
const ROUTING_KEY = 'import';
const RETRY_TTL = 30_000;
const MAX_RETRIES = 1;

export interface ImportPayload {
  jobId: string;
  wordsData: CreateWordDto[];
  packageId: number;
  userId: string;
}

@Injectable()
export class ImportQueueService {
  private readonly logger = new Logger(ImportQueueService.name);

  constructor(
    private readonly rabbitmq: RabbitmqService,
    private readonly cache: CacheService,
    private readonly wordsService: WordsService,
    private readonly jobTracker: JobTrackerService,
  ) {}

  async setupTopology(): Promise<void> {
    const ch = this.rabbitmq.getChannel();
    if (!ch) throw new Error('Channel not available');

    await ch.assertExchange(EXCHANGE, 'direct', { durable: true });
    await ch.assertExchange(RETRY_EXCHANGE, 'direct', { durable: true });

    await ch.assertQueue(QUEUE, {
      durable: true,
      arguments: { 'x-dead-letter-exchange': RETRY_EXCHANGE },
    });

    await ch.assertQueue(RETRY_QUEUE, {
      durable: true,
      arguments: {
        'x-message-ttl': RETRY_TTL,
        'x-dead-letter-exchange': EXCHANGE,
      },
    });

    await ch.assertQueue(FAILED_QUEUE, { durable: true });

    await ch.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);
    await ch.bindQueue(RETRY_QUEUE, RETRY_EXCHANGE, ROUTING_KEY);

    this.logger.log('Topology ready.');
  }

  publish(payload: ImportPayload): boolean {
    const ch = this.rabbitmq.getChannel();
    if (!ch) return false;

    ch.publish(EXCHANGE, ROUTING_KEY, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
      contentType: 'application/json',
    });
    return true;
  }

  /** Start consuming import jobs (called in worker process) */
  async startConsumer(): Promise<void> {
    const ch = await this.rabbitmq.createChannel();
    if (!ch) throw new Error('Channel not available');

    await ch.consume(QUEUE, async (msg) => {
      if (!msg) return;

      let payload: ImportPayload;
      try {
        payload = JSON.parse(msg.content.toString());
      } catch {
        this.logger.warn('Discarding message with invalid JSON.');
        return ch.ack(msg);
      }

      const { jobId, wordsData, packageId, userId } = payload;

      try {
        await this.jobTracker.update(jobId, {
          status: 'processing',
          progress: { current: 0, total: wordsData.length, phase: 'parsing' },
        });

        // Reuse WordsService.addWords (Gemini enrichment + find-or-create + transaction)
        const result = await this.wordsService.addWords(packageId, wordsData, (phase) =>
          this.jobTracker.update(jobId, {
            progress: { current: 0, total: wordsData.length, phase },
          }),
        );

        await this.jobTracker.update(jobId, {
          status: 'completed',
          progress: { current: wordsData.length, total: wordsData.length, phase: 'done' },
          result: {
            imported: result.successCount,
            errors: wordsData.length - result.successCount,
            total: wordsData.length,
          },
        });

        // Invalidate cache
        await this.cache.del([
          CACHE_KEYS.dashboard(userId),
          CACHE_KEYS.packagesUser(userId),
          CACHE_KEYS.words(packageId),
        ]);

        ch.ack(msg);
        this.logger.log(
          `Job ${jobId} completed: ${result.successCount} imported.`,
        );
      } catch (err) {
        this.logger.error(
          `Job ${jobId} failed: ${err instanceof Error ? err.message : err}`,
        );

        const retries = this.getRetryCount(msg);
        if (retries >= MAX_RETRIES) {
          await this.jobTracker.update(jobId, {
            status: 'failed',
            error: err instanceof Error ? err.message : String(err),
          });
          ch.sendToQueue(FAILED_QUEUE, msg.content, { persistent: true });
          ch.ack(msg);
        } else {
          await this.jobTracker.update(jobId, {
            status: 'retrying',
            error: err instanceof Error ? err.message : String(err),
          });
          ch.nack(msg, false, false);
        }
      }
    });

    this.logger.log('Consumer started — waiting for import jobs.');
  }

  private getRetryCount(msg: { properties?: { headers?: Record<string, unknown> } }): number {
    const deaths = msg.properties?.headers?.['x-death'];
    if (!Array.isArray(deaths)) return 0;
    const entry = deaths.find(
      (d: Record<string, unknown>) => d.queue === QUEUE && d.reason === 'rejected',
    );
    return (entry?.count as number) || 0;
  }
}
