import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service.js';

const PREFIX = 'cache:';

@Injectable()
export class CacheService {
  constructor(private readonly redis: RedisService) {}

  async get<T = unknown>(key: string): Promise<T | null> {
    if (!this.redis.isReady()) return null;
    try {
      const raw = await this.redis.getClient()!.get(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<boolean> {
    if (!this.redis.isReady()) return false;
    try {
      await this.redis.getClient()!.set(PREFIX + key, JSON.stringify(value), {
        EX: ttlSeconds,
      });
      return true;
    } catch {
      return false;
    }
  }

  /** Set if not exists (for dedup / idempotence) */
  async setNX(key: string, value: unknown, ttlSeconds: number): Promise<boolean> {
    if (!this.redis.isReady()) return false;
    try {
      const result = await this.redis.getClient()!.set(
        PREFIX + key,
        JSON.stringify(value),
        { EX: ttlSeconds, NX: true },
      );
      return result === 'OK';
    } catch {
      return false;
    }
  }

  async del(keys: string | string[]): Promise<boolean> {
    if (!this.redis.isReady()) return false;
    try {
      const list = Array.isArray(keys) ? keys : [keys];
      const prefixed = list.map((k) => PREFIX + k);
      await this.redis.getClient()!.del(prefixed);
      return true;
    } catch {
      return false;
    }
  }

  async invalidatePattern(pattern: string): Promise<boolean> {
    if (!this.redis.isReady()) return false;
    try {
      const client = this.redis.getClient()!;
      let cursor = '0';
      do {
        const result = await client.scan(cursor, {
          MATCH: PREFIX + pattern,
          COUNT: 100,
        });
        cursor = String(result.cursor);
        if (result.keys.length > 0) {
          await client.del(result.keys);
        }
      } while (cursor !== '0');
      return true;
    } catch {
      return false;
    }
  }
}
