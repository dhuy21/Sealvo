import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service.js';
import { CacheService } from '../redis/cache.service.js';
import { RedisService } from '../redis/redis.service.js';
import { EmailService } from './email.service.js';
import { CACHE_KEYS, CACHE_TTL } from '../redis/cache-keys.constant.js';

const EXCHANGE = 'email.direct';
const RETRY_EXCHANGE = 'email.retry.direct';
const QUEUE = 'email.send';
const RETRY_QUEUE = 'email.retry';
const FAILED_QUEUE = 'email.failed';
const ROUTING_KEY = 'email';
const RETRY_TTL = 10_000;
const MAX_RETRIES = 2;

export interface EmailPayload {
  to: string;
  content: string;
  subject: string;
}

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);

  constructor(
    private readonly rabbitmq: RabbitmqService,
    private readonly cache: CacheService,
    private readonly redis: RedisService,
    private readonly emailService: EmailService,
  ) {}

  /** Assert exchange + queue topology (called once on startup) */
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

  /** Publish email job to queue */
  publish(payload: EmailPayload): boolean {
    const ch = this.rabbitmq.getChannel();
    if (!ch) return false;

    ch.publish(EXCHANGE, ROUTING_KEY, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
      contentType: 'application/json',
      messageId: randomUUID(),
    });
    return true;
  }

  /** Enqueue via RabbitMQ, fallback to direct send if queue unavailable */
  async enqueue(payload: EmailPayload): Promise<boolean> {
    if (this.rabbitmq.isReady()) return this.publish(payload);

    // Fallback: send directly
    return this.emailService.sendEmail(payload.to, payload.content, payload.subject);
  }

  /** Start consuming email jobs (called in worker process) */
  async startConsumer(): Promise<void> {
    const ch = this.rabbitmq.getChannel();
    if (!ch) throw new Error('Channel not available');

    await ch.consume(QUEUE, async (msg) => {
      if (!msg) return;

      // Dedup via Redis
      const dedupId = msg.properties.messageId;
      if (dedupId && this.redis.isReady()) {
        const isNew = await this.cache.setNX(
          CACHE_KEYS.emailDedup(dedupId),
          1,
          CACHE_TTL.EMAIL_DEDUP,
        );
        if (!isNew) {
          this.logger.warn(`Duplicate detected (${dedupId}) — skipping.`);
          return ch.ack(msg);
        }
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
        ch.ack(msg);
      } catch (err) {
        const retries = this.getRetryCount(msg);
        if (retries >= MAX_RETRIES) {
          this.logger.error(
            `Giving up after ${retries} retries — moving to ${FAILED_QUEUE}: ${err instanceof Error ? err.message : err}`,
          );
          ch.sendToQueue(FAILED_QUEUE, msg.content, { persistent: true });
          ch.ack(msg);
        } else {
          this.logger.warn(
            `Send failed (retry ${retries + 1}/${MAX_RETRIES}): ${err instanceof Error ? err.message : err}`,
          );
          ch.nack(msg, false, false);
        }
      }
    });

    this.logger.log('Consumer started — waiting for email jobs.');
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
