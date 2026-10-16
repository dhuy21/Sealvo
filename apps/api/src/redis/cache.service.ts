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

  /** Set if not exists (for dedup / idempotence); null when Redis is unavailable or errors */
  async setNX(key: string, value: unknown, ttlSeconds: number): Promise<boolean | null> {
    if (!this.redis.isReady()) return null;
    try {
      const result = await this.redis.getClient()!.set(
        PREFIX + key,
        JSON.stringify(value),
        { EX: ttlSeconds, NX: true },
      );
      return result === 'OK';
    } catch {
      return null;
    }
  }

  /** HSET one field and refresh the key's TTL in a single MULTI */
  async hSet(key: string, field: string, value: string, ttlSeconds: number): Promise<boolean> {
    if (!this.redis.isReady()) return false;
    try {
      await this.redis
        .getClient()!
        .multi()
        .hSet(PREFIX + key, field, value)
        .expire(PREFIX + key, ttlSeconds)
        .exec();
      return true;
    } catch {
      return false;
    }
  }

  async hGetAll(key: string): Promise<Record<string, string> | null> {
    if (!this.redis.isReady()) return null;
    try {
      return await this.redis.getClient()!.hGetAll(PREFIX + key);
    } catch {
      return null;
    }
  }

  /** Number of fields actually removed; null when Redis is unavailable or errors */
  async hDel(key: string, fields: string[]): Promise<number | null> {
    if (!this.redis.isReady()) return null;
    try {
      return await this.redis.getClient()!.hDel(PREFIX + key, fields);
    } catch {
      return null;
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
}
