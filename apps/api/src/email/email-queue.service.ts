import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { randomUUID } from 'crypto';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service.js';
import { RetryQueue } from '../rabbitmq/retry-queue.js';
import { CacheService } from '../redis/cache.service.js';
import { EmailService } from './email.service.js';
import { CACHE_KEYS, CACHE_TTL } from '../redis/cache-keys.constants.js';
import { errorMessage } from '../common/utils/error-message.js';

const QUEUE = new RetryQueue({
  name: 'email',
  queue: 'email.send',
  retryTtl: 10_000,
  maxRetries: 2,
});
const DIRECT_SEND_RETRIES = 2;

export interface EmailPayload {
  to: string;
  content: string;
  subject: string;
}

@Injectable()
export class EmailQueueService implements OnModuleInit {
  private readonly logger = new Logger(EmailQueueService.name);

  constructor(
    private readonly rabbitmq: RabbitmqService,
    private readonly cache: CacheService,
    private readonly emailService: EmailService,
  ) {}

  onModuleInit() {
    this.rabbitmq.onChannelReady(async (ch) => {
      await QUEUE.assertTopology(ch);
      this.logger.log('Topology ready.');
    });
  }

  /** Publish email job to queue; false unless the broker confirmed it */
  publish(payload: EmailPayload): Promise<boolean> {
    return this.rabbitmq.publish(
      QUEUE.exchange,
      QUEUE.routingKey,
      Buffer.from(JSON.stringify(payload)),
      {
        persistent: true,
        contentType: 'application/json',
        messageId: randomUUID(),
      },
    );
  }

  /** Enqueue via RabbitMQ, fallback to direct send if the queue is unavailable or rejects it */
  async enqueue(payload: EmailPayload): Promise<boolean> {
    if (await this.publish(payload)) return true;

    // Fallback: send directly, without the queue's retries
    return this.emailService.sendEmail(payload.to, payload.content, payload.subject, {
      retries: DIRECT_SEND_RETRIES,
    });
  }

  /** Start consuming email jobs (called in worker process) */
  async startConsumer(): Promise<void> {
    await this.rabbitmq.consume(QUEUE.queue, (msg, ch) => this.handle(msg, ch));
    this.logger.log('Consumer started — waiting for email jobs.');
  }

  /**
   * Marked as sent only once SES accepted it: a delivery interrupted before that (worker stopped)
   * is sent on redelivery instead of being skipped. The rare stop between the two sends it twice.
   */
  private async handle(msg: ConsumeMessage, ch: ConfirmChannel): Promise<void> {
    const dedupId = msg.properties.messageId as string | undefined;
    if (dedupId && (await this.cache.get(CACHE_KEYS.emailDedup(dedupId))) !== null) {
      this.logger.warn(`Duplicate detected (${dedupId}) — skipping.`);
      return ch.ack(msg);
    }

    let payload: EmailPayload;
    try {
      payload = JSON.parse(msg.content.toString());
    } catch {
      this.logger.warn('Discarding message with invalid JSON.');
      return ch.ack(msg);
    }

    try {
      const result = await this.emailService.sendEmail(
        payload.to,
        payload.content,
        payload.subject,
      );
      if (!result) throw new Error('sendEmail returned false');
    } catch (err) {
      const retries = QUEUE.retryCount(msg);
      if (QUEUE.exhausted(msg)) {
        this.logger.error(
          `Giving up after ${retries} retries — moving to the failed queue: ${errorMessage(err)}`,
        );
      } else {
        this.logger.warn(
          `Send failed (retry ${retries + 1}/${QUEUE.maxRetries}): ${errorMessage(err)}`,
        );
      }
      return QUEUE.reject(msg, ch);
    }

    if (dedupId) await this.cache.set(CACHE_KEYS.emailDedup(dedupId), 1, CACHE_TTL.EMAIL_DEDUP);
    ch.ack(msg);
  }
}
