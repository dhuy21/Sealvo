import { RedisThrottlerStorage } from './redis-throttler.storage.js';
import type { RedisService } from '../../redis/redis.service.js';

describe('RedisThrottlerStorage', () => {
  let client: { eval: any };
  let ready: boolean;
  let storage: RedisThrottlerStorage;

  beforeEach(() => {
    client = { eval: vi.fn() };
    ready = true;
    const redis = {
      getClient: () => client,
      isReady: () => ready,
    } as unknown as RedisService;
    storage = new RedisThrottlerStorage(redis);
  });

  afterEach(() => storage.onApplicationShutdown());

  it('runs one atomic script per hit and converts ms to seconds', async () => {
    client.eval.mockResolvedValue([3, 59_001, 0, 0]);

    const record = await storage.increment('abc', 60_000, 100, 60_000, 'default');

    expect(client.eval).toHaveBeenCalledTimes(1);
    const [script, options] = client.eval.mock.calls[0];
    expect(script).toContain('INCR');
    expect(options).toEqual({
      keys: ['throttle:abc', 'throttle:abc:blocked'],
      arguments: ['60000', '100', '60000'],
    });
    expect(record).toEqual({
      totalHits: 3,
      timeToExpire: 60,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
  });

  it('reports a blocked key', async () => {
    client.eval.mockResolvedValue([6, 30_000, 1, 30_000]);

    const record = await storage.increment('abc', 60_000, 5, 30_000, 'default');

    expect(record).toEqual({
      totalHits: 6,
      timeToExpire: 30,
      isBlocked: true,
      timeToBlockExpire: 30,
    });
  });

  it('falls back to in-memory storage when Redis is not ready', async () => {
    ready = false;

    await storage.increment('abc', 60_000, 1, 60_000, 'default');
    const second = await storage.increment('abc', 60_000, 1, 60_000, 'default');

    expect(client.eval).not.toHaveBeenCalled();
    expect(second.isBlocked).toBe(true);
  });

  it('falls back to in-memory storage when the Redis command fails', async () => {
    client.eval.mockRejectedValue(new Error('connection lost'));

    const record = await storage.increment('abc', 60_000, 100, 60_000, 'default');

    expect(record).toMatchObject({ totalHits: 1, isBlocked: false });
  });
});
