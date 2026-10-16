import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType | null = null;
  private ready = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  /** Build Redis URL from env vars (same logic as old redis.js) */
  private buildUrl(): string | null {
    const url = this.config.get<string>('REDIS_URL');
    if (url) return url;

    const host = this.config.get<string>('REDIS_HOST');
    if (!host) return null;

    const port = this.config.get<string>('REDIS_PORT') ?? '6379';
    const password = this.config.get<string>('REDIS_PASSWORD');
    const user = this.config.get<string>('REDIS_USER') ?? 'default';

    if (password) return `redis://${user}:${encodeURIComponent(password)}@${host}:${port}`;
    return `redis://${host}:${port}`;
  }

  async connect(): Promise<void> {
    const url = this.buildUrl();
    if (!url) {
      this.logger.warn('No REDIS_URL or REDIS_HOST — running without Redis.');
      return;
    }

    const instance = createClient({
      url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 30) return new Error('Max reconnect attempts reached.');
          return Math.min(retries * 500, 10_000);
        },
      },
    });

    instance.on('error', (err: Error) => {
      this.ready = false;
      this.logger.error(`Error: ${err.message}`);
    });

    instance.on('ready', () => {
      this.ready = true;
      this.logger.log('Connected and ready.');
    });

    instance.on('end', () => {
      this.ready = false;
      this.client = null;
    });

    try {
      await instance.connect();
      this.client = instance as RedisClientType;
    } catch (err) {
      this.logger.error(
        `Connection failed: ${err instanceof Error ? err.message : err}`,
      );
      try {
        await instance.disconnect();
      } catch {
        /* ignore */
      }
      this.client = null;
    }
  }

  getClient(): RedisClientType | null {
    return this.client;
  }

  isReady(): boolean {
    return this.ready;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        if (this.ready) {
          await this.client.quit();
        } else {
          await this.client.disconnect();
        }
      } catch {
        try {
          await this.client.disconnect();
        } catch {
          /* ignore */
        }
      }
      this.client = null;
      this.ready = false;
      this.logger.log('Disconnected.');
    }
  }

  /** Create a duplicate client for Pub/Sub subscriptions */
  async createSubscriber(): Promise<RedisClientType | null> {
    if (!this.client) return null;
    try {
      const sub = this.client.duplicate() as RedisClientType;
      await sub.connect();
      return sub;
    } catch {
      return null;
    }
  }
}
