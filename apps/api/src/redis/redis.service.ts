import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { TimeoutError, withTimeout } from '@sealvo/shared';
import { redisConfig, type RedisConfig } from '../config/redis.config.js';
import { createClient, type RedisClientType } from 'redis';

const MAX_RECONNECT_DELAY_MS = 10_000;
const CONNECT_TIMEOUT_MS = 5_000;
const WATCHDOG_INTERVAL_MS = 3_000;
const PING_TIMEOUT_MS = 1_000;

/** Never gives up: returning an Error would leave the client closed for good. */
const reconnectDelay = (retries: number) =>
  Math.min(retries * 500, MAX_RECONNECT_DELAY_MS);

/**
 * Starts connecting and resolves after the first attempt: true once ready, false on its first error.
 * Retries go on in the background either way. The client must already have an 'error' listener.
 */
function connectFirstAttempt(client: RedisClientType): Promise<boolean> {
  const firstAttempt = new Promise<boolean>((resolve) => {
    const onReady = () => {
      client.off('error', onError);
      resolve(true);
    };
    const onError = () => {
      client.off('ready', onReady);
      resolve(false);
    };
    client.once('ready', onReady);
    client.once('error', onError);
  });
  client.connect().catch(() => {
    /* rejects only when the client is closed while still retrying */
  });
  return firstAttempt;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType | null = null;
  private ready = false;
  private watchdog: NodeJS.Timeout | null = null;
  private checking = false;

  constructor(@Inject(redisConfig.KEY) private readonly config: RedisConfig) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  async connect(): Promise<void> {
    const { url } = this.config;
    if (!url) {
      this.logger.warn('No REDIS_URL or REDIS_HOST — running without Redis.');
      return;
    }

    const instance = createClient({
      url,
      socket: { reconnectStrategy: reconnectDelay, connectTimeout: CONNECT_TIMEOUT_MS },
      // While reconnecting, commands fail at once and callers fall back instead of queueing
      disableOfflineQueue: true,
    }) as RedisClientType;

    // Events of a client replaced by the watchdog must not touch the current one
    instance.on('error', (err: Error) => {
      if (this.client !== instance) return;
      this.ready = false;
      this.logger.error(`Error: ${err.message}`);
    });

    instance.on('ready', () => {
      if (this.client !== instance) return;
      this.ready = true;
      this.logger.log('Connected and ready.');
    });

    instance.on('end', () => {
      if (this.client !== instance) return;
      this.ready = false;
      this.client = null;
    });

    this.client = instance;
    this.startWatchdog();
    // Boot waits for the first attempt only; while Redis is down, callers see isReady() === false
    await connectFirstAttempt(instance);
  }

  /**
   * node-redis times a command out only until it is written: on a stalled connection (no TCP reset)
   * the reply would be awaited for minutes, and every request with it (the throttler runs on each).
   * A PING without a reply marks Redis down, so callers fall back, and replaces the client, which
   * fails the commands still waiting.
   */
  private startWatchdog() {
    if (this.watchdog) return;
    this.watchdog = setInterval(() => void this.checkAlive(), WATCHDOG_INTERVAL_MS);
    this.watchdog.unref();
  }

  private async checkAlive() {
    const instance = this.client;
    if (!instance || !this.ready || this.checking) return;
    this.checking = true;
    try {
      await withTimeout(() => instance.ping(), PING_TIMEOUT_MS);
    } catch (err) {
      // Other errors come with an 'error' event and node-redis reconnects by itself
      if (!(err instanceof TimeoutError) || this.client !== instance) return;
      this.logger.error(`No reply to PING within ${PING_TIMEOUT_MS} ms: reconnecting.`);
      this.ready = false;
      this.client = null;
      instance.destroy();
      await this.connect();
    } finally {
      this.checking = false;
    }
  }

  getClient(): RedisClientType | null {
    return this.client;
  }

  isReady(): boolean {
    return this.ready;
  }

  async disconnect(): Promise<void> {
    if (this.watchdog) clearInterval(this.watchdog);
    this.watchdog = null;
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

  /** Create a duplicate client for Pub/Sub subscriptions; null unless it connects on the first attempt */
  async createSubscriber(): Promise<RedisClientType | null> {
    if (!this.client || !this.ready) return null;
    const sub = this.client.duplicate() as RedisClientType;
    sub.on('error', (err: Error) => this.logger.warn(`Subscriber error: ${err.message}`));
    if (await connectFirstAttempt(sub)) return sub;
    sub.destroy();
    return null;
  }
}
