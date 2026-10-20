import type { Channel, ConfirmChannel, ConsumeMessage } from 'amqplib';

export interface RetryQueueConfig {
  /** Prefix of the exchanges, queues and routing key */
  name: string;
  /** Work queue the consumer reads */
  queue: string;
  /** How long a rejected message waits before it comes back */
  retryTtl: number;
  maxRetries: number;
}

/**
 * A work queue whose rejected messages come back after `retryTtl`, at most `maxRetries` times,
 * then are parked in a failed queue for inspection:
 * `<name>.direct` → queue, rejected → `<name>.retry.direct` → `<name>.retry` (TTL) → `<name>.direct`.
 */
export class RetryQueue {
  readonly exchange: string;
  readonly routingKey: string;
  private readonly retryExchange: string;
  private readonly retryQueue: string;
  private readonly failedQueue: string;

  constructor(private readonly config: RetryQueueConfig) {
    this.exchange = `${config.name}.direct`;
    this.routingKey = config.name;
    this.retryExchange = `${config.name}.retry.direct`;
    this.retryQueue = `${config.name}.retry`;
    this.failedQueue = `${config.name}.failed`;
  }

  get queue(): string {
    return this.config.queue;
  }

  get maxRetries(): number {
    return this.config.maxRetries;
  }

  /** Asserted on every new channel, in the API (publisher) and the worker (consumer) */
  async assertTopology(ch: Channel): Promise<void> {
    await ch.assertExchange(this.exchange, 'direct', { durable: true });
    await ch.assertExchange(this.retryExchange, 'direct', { durable: true });
    await ch.assertQueue(this.queue, {
      durable: true,
      arguments: { 'x-dead-letter-exchange': this.retryExchange },
    });
    await ch.assertQueue(this.retryQueue, {
      durable: true,
      arguments: {
        'x-message-ttl': this.config.retryTtl,
        'x-dead-letter-exchange': this.exchange,
      },
    });
    await ch.assertQueue(this.failedQueue, { durable: true });
    await ch.bindQueue(this.queue, this.exchange, this.routingKey);
    await ch.bindQueue(this.retryQueue, this.retryExchange, this.routingKey);
  }

  /** Times the message was rejected from the work queue (RabbitMQ's x-death header) */
  retryCount(msg: Pick<ConsumeMessage, 'properties'>): number {
    const deaths: unknown = msg.properties.headers?.['x-death'];
    if (!Array.isArray(deaths)) return 0;
    const entry = (deaths as Record<string, unknown>[]).find(
      (d) => d.queue === this.queue && d.reason === 'rejected',
    );
    return (entry?.count as number) || 0;
  }

  /** No retry left: reject() parks the message */
  exhausted(msg: Pick<ConsumeMessage, 'properties'>): boolean {
    return this.retryCount(msg) >= this.config.maxRetries;
  }

  /**
   * Back through the retry queue, or into the failed queue once exhausted. The original is acked
   * only once the broker confirmed the parked copy; otherwise it goes round the retry queue again.
   */
  async reject(msg: ConsumeMessage, ch: ConfirmChannel): Promise<void> {
    if (!this.exhausted(msg)) return ch.nack(msg, false, false);
    try {
      await new Promise<void>((resolve, reject) =>
        ch.sendToQueue(this.failedQueue, msg.content, { persistent: true }, (err) =>
          err ? reject(err instanceof Error ? err : new Error(String(err))) : resolve(),
        ),
      );
    } catch {
      return ch.nack(msg, false, false);
    }
    ch.ack(msg);
  }
}
