import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Channel, ConfirmChannel, ConsumeMessage } from 'amqplib';
import { randomUUID } from 'crypto';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service.js';
import { CacheService } from '../redis/cache.service.js';
import { EmailService } from './email.service.js';
import { CACHE_KEYS, CACHE_TTL } from '../redis/cache-keys.constants.js';
import { errorMessage } from '../common/utils/error-message.js';

const EXCHANGE = 'email.direct';
const RETRY_EXCHANGE = 'email.retry.direct';
const QUEUE = 'email.send';
const RETRY_QUEUE = 'email.retry';
const FAILED_QUEUE = 'email.failed';
const ROUTING_KEY = 'email';
const RETRY_TTL = 10_000;
const MAX_RETRIES = 2;
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
    this.rabbitmq.onChannelReady((ch) => this.setupTopology(ch));
  }

  /** Assert exchange + queue topology (on every new channel, in the API and the worker) */
  private async setupTopology(ch: Channel): Promise<void> {
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

  /** Publish email job to queue; false unless the broker confirmed it */
  publish(payload: EmailPayload): Promise<boolean> {
    return this.rabbitmq.publish(EXCHANGE, ROUTING_KEY, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
      contentType: 'application/json',
      messageId: randomUUID(),
    });
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
    await this.rabbitmq.consume(QUEUE, (msg, ch) => this.handle(msg, ch));
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
      const retries = this.getRetryCount(msg);
      if (retries >= MAX_RETRIES) {
        this.logger.error(
          `Giving up after ${retries} retries — moving to ${FAILED_QUEUE}: ${errorMessage(err)}`,
        );
        ch.sendToQueue(FAILED_QUEUE, msg.content, { persistent: true });
        ch.ack(msg);
      } else {
        this.logger.warn(`Send failed (retry ${retries + 1}/${MAX_RETRIES}): ${errorMessage(err)}`);
        ch.nack(msg, false, false);
      }
      return;
    }

    if (dedupId) await this.cache.set(CACHE_KEYS.emailDedup(dedupId), 1, CACHE_TTL.EMAIL_DEDUP);
    ch.ack(msg);
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
