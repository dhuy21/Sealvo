import { Logger, OnApplicationShutdown } from '@nestjs/common';
import { ThrottlerStorageService, type ThrottlerStorage } from '@nestjs/throttler';
import { RedisService } from '../../redis/redis.service.js';

const PREFIX = 'throttle:';

// Fixed window per key; mirrors ThrottlerStorageService: once hits exceed the limit the key is
// blocked for blockDuration and the window restarts after the block. Returns ms values.
const INCREMENT_SCRIPT = `
local blockTtl = redis.call('PTTL', KEYS[2])
if blockTtl > 0 then
  return { tonumber(ARGV[2]) + 1, blockTtl, 1, blockTtl }
end
local hits = redis.call('INCR', KEYS[1])
local hitTtl = redis.call('PTTL', KEYS[1])
if hitTtl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  hitTtl = tonumber(ARGV[1])
end
if hits <= tonumber(ARGV[2]) then
  return { hits, hitTtl, 0, 0 }
end
if tonumber(ARGV[3]) <= 0 then
  return { hits, hitTtl, 1, hitTtl }
end
redis.call('SET', KEYS[2], '1', 'PX', ARGV[3])
redis.call('DEL', KEYS[1])
return { hits, hitTtl, 1, tonumber(ARGV[3]) }
`;

export class RedisThrottlerStorage implements ThrottlerStorage, OnApplicationShutdown {
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private readonly fallback = new ThrottlerStorageService();

  constructor(private readonly redis: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): ReturnType<ThrottlerStorage['increment']> {
    const client = this.redis.getClient();
    if (!client || !this.redis.isReady()) {
      return this.fallback.increment(key, ttl, limit, blockDuration, throttlerName);
    }

    try {
      const [totalHits, timeToExpire, isBlocked, timeToBlockExpire] = (await client.eval(
        INCREMENT_SCRIPT,
        {
          keys: [PREFIX + key, `${PREFIX}${key}:blocked`],
          arguments: [String(ttl), String(limit), String(blockDuration)],
        },
      )) as number[];

      return {
        totalHits,
        timeToExpire: Math.ceil(timeToExpire / 1000),
        isBlocked: isBlocked === 1,
        timeToBlockExpire: Math.ceil(timeToBlockExpire / 1000),
      };
    } catch (err) {
      this.logger.warn(
        `Redis unavailable, using in-memory throttling: ${err instanceof Error ? err.message : String(err)}`,
      );
      return this.fallback.increment(key, ttl, limit, blockDuration, throttlerName);
    }
  }

  onApplicationShutdown() {
    this.fallback.onApplicationShutdown();
  }
}
