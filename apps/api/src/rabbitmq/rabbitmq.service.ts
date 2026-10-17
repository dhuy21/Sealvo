import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { rabbitmqConfig, type RabbitmqConfig } from '../config/rabbitmq.config.js';
import amqp from 'amqplib';

type ChannelReadyHandler = (channel: amqp.ConfirmChannel) => Promise<void>;
/** Acks or nacks the message on the channel it was delivered on */
export type MessageHandler = (msg: amqp.ConsumeMessage, channel: amqp.ConfirmChannel) => Promise<void>;

interface Consumer {
  channel: amqp.ConfirmChannel;
  tag: string;
  inFlight: Set<Promise<void>>;
}

/** Longest wait for the messages being handled when the process stops; the rest are redelivered */
const DRAIN_TIMEOUT_MS = 25_000;

@Injectable()
export class RabbitmqService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(RabbitmqService.name);
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.ConfirmChannel | null = null;
  private ready = false;
  private closing = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly connectionLostHandlers: (() => void)[] = [];
  private readonly channelReadyHandlers: ChannelReadyHandler[] = [];
  private readonly consumers: Consumer[] = [];

  constructor(@Inject(rabbitmqConfig.KEY) private readonly config: RabbitmqConfig) {}

  /**
   * Consumers live on the lost connection's channels: reconnecting does not bring them back.
   * Also called when a consumer's own channel closes or the broker cancels a consumer.
   */
  onConnectionLost(handler: () => void): void {
    this.connectionLostHandlers.push(handler);
  }

  /**
   * Runs on every new main channel, before it is used for publishing (e.g. to assert topology).
   * Register from onModuleInit: the first connection is made at application bootstrap.
   */
  onChannelReady(handler: ChannelReadyHandler): void {
    this.channelReadyHandlers.push(handler);
  }

  async onApplicationBootstrap() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  async connect(): Promise<void> {
    const { url } = this.config;
    if (!url) {
      this.logger.warn('No RABBITMQ_URL or RABBITMQ_HOST — skipping.');
      return;
    }

    let conn: amqp.ChannelModel | null = null;
    try {
      conn = await amqp.connect(url);
      this.connection = conn;

      conn.on('error', (err: Error) => {
        this.logger.error(`Connection error: ${err.message}`);
        this.ready = false;
      });

      conn.on('close', () => {
        this.ready = false;
        this.connection = null;
        this.channel = null;
        if (this.closing) return;
        this.connectionLostHandlers.forEach((handler) => handler());
        this.scheduleReconnect();
      });

      this.channel = await this.openChannel(conn);
      this.ready = true;
      this.logger.log('Connected to RabbitMQ.');
    } catch (err) {
      this.logger.error(
        `Failed to connect: ${err instanceof Error ? err.message : err}`,
      );
      this.ready = false;
      conn?.close().catch(() => {
        /* already closed */
      });
      this.scheduleReconnect();
    }
  }

  private async openChannel(conn: amqp.ChannelModel): Promise<amqp.ConfirmChannel> {
    const ch = await conn.createConfirmChannel();

    ch.on('error', (err: Error) => {
      this.logger.error(`Channel error: ${err.message}`);
    });

    // The broker closes the channel on errors such as publishing to a missing exchange:
    // reconnecting is the single recovery path, and it re-runs the channel ready handlers.
    ch.on('close', () => {
      if (this.channel !== ch) return;
      this.channel = null;
      this.ready = false;
      if (this.closing) return;
      this.logger.warn('Channel closed unexpectedly — reconnecting.');
      conn.close().catch(() => {
        /* connection already closing: its close handler reconnects */
      });
    });

    await ch.prefetch(1);
    for (const handler of this.channelReadyHandlers) await handler(ch);
    return ch;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.closing) return;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      this.logger.log('Attempting to reconnect...');
      await this.connect();
    }, 5000);
  }

  getChannel(): amqp.ConfirmChannel | null {
    return this.channel;
  }

  /** Resolves once the broker confirms the message; false when the channel is down, or on nack/error. */
  async publish(
    exchange: string,
    routingKey: string,
    content: Buffer,
    options: amqp.Options.Publish,
  ): Promise<boolean> {
    const ch = this.channel;
    if (!ch) return false;
    try {
      await new Promise<void>((resolve, reject) => {
        ch.publish(exchange, routingKey, content, options, (err) =>
          err ? reject(err instanceof Error ? err : new Error(String(err))) : resolve(),
        );
      });
      return true;
    } catch (err) {
      this.logger.warn(
        `Publish to ${exchange} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }

  /**
   * Consumes a queue on a dedicated channel (its own prefetch). A handler that throws gets its
   * message dead-lettered; stopConsumers() lets the messages in flight finish.
   */
  async consume(queue: string, handler: MessageHandler, prefetch = 1): Promise<void> {
    if (!this.connection) throw new Error('RabbitMQ not connected');
    const channel = await this.connection.createConfirmChannel();
    const lost = (reason: string) => {
      if (this.closing) return;
      this.logger.error(`Consumer of ${queue} lost: ${reason}`);
      this.connectionLostHandlers.forEach((notify) => notify());
    };
    channel.on('error', (err: Error) => this.logger.error(`Consumer channel error (${queue}): ${err.message}`));
    channel.on('close', () => lost('channel closed'));
    await channel.prefetch(prefetch);

    const consumer: Consumer = { channel, tag: '', inFlight: new Set() };
    const { consumerTag } = await channel.consume(queue, (msg) => {
      // null: the broker cancelled the consumer (queue deleted)
      if (!msg) return lost('cancelled by the broker');
      const run = handler(msg, channel)
        .catch((err: unknown) => {
          this.logger.error(`Unhandled error on ${queue}: ${err instanceof Error ? err.message : String(err)}`);
          try {
            channel.nack(msg, false, false);
          } catch {
            /* channel closed: the broker redelivers it */
          }
        })
        .finally(() => consumer.inFlight.delete(run));
      consumer.inFlight.add(run);
    });
    consumer.tag = consumerTag;
    this.consumers.push(consumer);
  }

  /** Stops new deliveries, then waits (up to 25 s) for the messages being handled */
  async stopConsumers(): Promise<void> {
    this.closing = true;
    await Promise.all(this.consumers.map(({ channel, tag }) => channel.cancel(tag).catch(() => {})));
    const inFlight = this.consumers.flatMap(({ inFlight }) => [...inFlight]);
    if (inFlight.length === 0) return;
    this.logger.log(`Waiting for ${inFlight.length} message(s) in progress...`);
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      Promise.allSettled(inFlight),
      new Promise((resolve) => (timer = setTimeout(resolve, DRAIN_TIMEOUT_MS))),
    ]);
    clearTimeout(timer);
  }

  isReady(): boolean {
    return this.ready;
  }

  async disconnect(): Promise<void> {
    this.closing = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.ready = false;

    for (const { channel } of this.consumers.splice(0)) {
      await channel.close().catch(() => {
        /* already closed */
      });
    }

    try {
      if (this.channel) await this.channel.close();
    } catch {
      /* already closed */
    }

    try {
      if (this.connection) await this.connection.close();
    } catch {
      /* already closed */
    }

    this.channel = null;
    this.connection = null;
    this.logger.log('Disconnected.');
  }
}
