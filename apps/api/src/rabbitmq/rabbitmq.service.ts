import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp from 'amqplib';

@Injectable()
export class RabbitmqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitmqService.name);
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.ConfirmChannel | null = null;
  private ready = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  /** Build AMQP URL from env vars (same logic as old rabbitmq.js) */
  private buildUrl(): string | null {
    const url = this.config.get<string>('RABBITMQ_URL');
    if (url) return url;

    const host = this.config.get<string>('RABBITMQ_HOST');
    if (!host) return null;

    const port = this.config.get<string>('RABBITMQ_PORT') ?? '5672';
    const user = this.config.get<string>('RABBITMQ_USER') ?? 'guest';
    const pass = this.config.get<string>('RABBITMQ_PASS') ?? 'guest';
    return `amqp://${user}:${pass}@${host}:${port}`;
  }

  async connect(): Promise<void> {
    const url = this.buildUrl();
    if (!url) {
      this.logger.warn('No RABBITMQ_URL or RABBITMQ_HOST — skipping.');
      return;
    }

    try {
      const conn = await amqp.connect(url);
      this.connection = conn;

      conn.on('error', (err: Error) => {
        this.logger.error(`Connection error: ${err.message}`);
        this.ready = false;
      });

      conn.on('close', () => {
        this.ready = false;
        this.connection = null;
        this.channel = null;
        this.scheduleReconnect();
      });

      const ch = await conn.createConfirmChannel();
      await ch.prefetch(1);
      this.channel = ch;

      ch.on('error', (err: Error) => {
        this.logger.error(`Channel error: ${err.message}`);
      });

      ch.on('close', () => {
        this.channel = null;
        this.ready = false;
      });

      this.ready = true;
      this.logger.log('Connected to RabbitMQ.');
    } catch (err) {
      this.logger.error(
        `Failed to connect: ${err instanceof Error ? err.message : err}`,
      );
      this.ready = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      this.logger.log('Attempting to reconnect...');
      await this.connect();
    }, 5000);
  }

  getChannel(): amqp.ConfirmChannel | null {
    return this.channel;
  }

  /** Create a dedicated channel with its own prefetch (for consumer isolation) */
  async createChannel(prefetch = 1): Promise<amqp.ConfirmChannel | null> {
    if (!this.connection) return null;
    try {
      const ch = await this.connection.createConfirmChannel();
      await ch.prefetch(prefetch);
      return ch;
    } catch (err) {
      this.logger.error(
        `Failed to create channel: ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.ready = false;

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
