/**
 * Unit tests: app/core/cache.js
 *
 * Covers every function (get, set, del, invalidatePattern) with:
 *   - happy path (Redis ready)
 *   - graceful degradation (Redis down)
 *   - error handling (Redis throws)
 *   - PREFIX consistency
 */
const redis = require('../../app/core/redis');
const cache = require('../../app/core/cache');

jest.mock('../../app/core/redis');

const mockClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  scan: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  redis.getClient.mockReturnValue(mockClient);
});

// ── get ─────────────────────────────────────────────────────────
describe('cache.get', () => {
  it('returns null when Redis is not ready (graceful degradation)', async () => {
    redis.isReady.mockReturnValue(false);
    const result = await cache.get('dashboard:u1');
    expect(result).toBeNull();
    expect(mockClient.get).not.toHaveBeenCalled();
  });

  it('returns parsed object on cache hit', async () => {
    redis.isReady.mockReturnValue(true);
    const data = { streak: 5, totalWords: 100 };
    mockClient.get.mockResolvedValue(JSON.stringify(data));

    const result = await cache.get('dashboard:u1');

    expect(mockClient.get).toHaveBeenCalledWith('cache:dashboard:u1');
    expect(result).toEqual(data);
  });

  it('returns null on cache miss (key does not exist)', async () => {
    redis.isReady.mockReturnValue(true);
    mockClient.get.mockResolvedValue(null);

    const result = await cache.get('dashboard:u999');

    expect(result).toBeNull();
  });

  it('returns null when Redis throws (graceful degradation)', async () => {
    redis.isReady.mockReturnValue(true);
    mockClient.get.mockRejectedValue(new Error('Connection lost'));

    const result = await cache.get('dashboard:u1');

    expect(result).toBeNull();
  });
});

// ── set ─────────────────────────────────────────────────────────
describe('cache.set', () => {
  it('returns false when Redis is not ready', async () => {
    redis.isReady.mockReturnValue(false);
    const result = await cache.set('dashboard:u1', { streak: 5 }, 300);
    expect(result).toBe(false);
    expect(mockClient.set).not.toHaveBeenCalled();
  });

  it('sets value with correct prefix and TTL', async () => {
    redis.isReady.mockReturnValue(true);
    mockClient.set.mockResolvedValue('OK');
    const data = { streak: 5 };

    const result = await cache.set('dashboard:u1', data, 300);

    expect(mockClient.set).toHaveBeenCalledWith('cache:dashboard:u1', JSON.stringify(data), {
      EX: 300,
    });
    expect(result).toBe(true);
  });

  it('returns false when Redis throws', async () => {
    redis.isReady.mockReturnValue(true);
    mockClient.set.mockRejectedValue(new Error('Write error'));

    const result = await cache.set('dashboard:u1', {}, 300);

    expect(result).toBe(false);
  });
});

// ── setNX (Phase 5 — idempotence / dedup) ───────────────────────
describe('cache.setNX', () => {
  it('returns false when Redis is not ready (safe fallback)', async () => {
    redis.isReady.mockReturnValue(false);
    const result = await cache.setNX('email:dedup:abc', 1, 86400);
    expect(result).toBe(false);
    expect(mockClient.set).not.toHaveBeenCalled();
  });

  it('returns true when key is new (first time)', async () => {
    redis.isReady.mockReturnValue(true);
    mockClient.set.mockResolvedValue('OK');

    const result = await cache.setNX('email:dedup:abc', 1, 86400);

    expect(mockClient.set).toHaveBeenCalledWith('cache:email:dedup:abc', '1', {
      EX: 86400,
      NX: true,
    });
    expect(result).toBe(true);
  });

  it('returns false when key already exists (duplicate)', async () => {
    redis.isReady.mockReturnValue(true);
    mockClient.set.mockResolvedValue(null);

    const result = await cache.setNX('email:dedup:abc', 1, 86400);

    expect(result).toBe(false);
  });

  it('returns false when Redis throws (graceful degradation)', async () => {
    redis.isReady.mockReturnValue(true);
    mockClient.set.mockRejectedValue(new Error('Redis error'));

    const result = await cache.setNX('email:dedup:abc', 1, 86400);

    expect(result).toBe(false);
  });
});

// ── del ─────────────────────────────────────────────────────────
describe('cache.del', () => {
  it('returns false when Redis is not ready', async () => {
    redis.isReady.mockReturnValue(false);
    const result = await cache.del('dashboard:u1');
    expect(result).toBe(false);
    expect(mockClient.del).not.toHaveBeenCalled();
  });

  it('deletes a single key with correct prefix', async () => {
    redis.isReady.mockReturnValue(true);
    mockClient.del.mockResolvedValue(1);

    const result = await cache.del('dashboard:u1');

    expect(mockClient.del).toHaveBeenCalledWith(['cache:dashboard:u1']);
    expect(result).toBe(true);
  });

  it('deletes multiple keys with correct prefixes', async () => {
    redis.isReady.mockReturnValue(true);
    mockClient.del.mockResolvedValue(3);

    const result = await cache.del(['pkgs:user:u1', 'pkgs:shared', 'dashboard:u1']);

    expect(mockClient.del).toHaveBeenCalledWith([
      'cache:pkgs:user:u1',
      'cache:pkgs:shared',
      'cache:dashboard:u1',
    ]);
    expect(result).toBe(true);
  });

  it('returns false when Redis throws', async () => {
    redis.isReady.mockReturnValue(true);
    mockClient.del.mockRejectedValue(new Error('Del error'));

    const result = await cache.del('dashboard:u1');

    expect(result).toBe(false);
  });
});

// ── invalidatePattern ───────────────────────────────────────────
describe('cache.invalidatePattern', () => {
  it('returns false when Redis is not ready', async () => {
    redis.isReady.mockReturnValue(false);
    const result = await cache.invalidatePattern('dashboard:*');
    expect(result).toBe(false);
  });

  it('scans and deletes matching keys', async () => {
    redis.isReady.mockReturnValue(true);
    mockClient.scan.mockResolvedValueOnce({
      cursor: 0,
      keys: ['cache:dashboard:u1', 'cache:dashboard:u2'],
    });
    mockClient.del.mockResolvedValue(2);

    const result = await cache.invalidatePattern('dashboard:*');

    expect(mockClient.scan).toHaveBeenCalledWith(0, { MATCH: 'cache:dashboard:*', COUNT: 100 });
    expect(mockClient.del).toHaveBeenCalledWith(['cache:dashboard:u1', 'cache:dashboard:u2']);
    expect(result).toBe(true);
  });

  it('handles multi-page SCAN (cursor != 0 on first call)', async () => {
    redis.isReady.mockReturnValue(true);
    mockClient.scan
      .mockResolvedValueOnce({ cursor: 42, keys: ['cache:dashboard:u1'] })
      .mockResolvedValueOnce({ cursor: 0, keys: ['cache:dashboard:u2'] });
    mockClient.del.mockResolvedValue(1);

    const result = await cache.invalidatePattern('dashboard:*');

    expect(mockClient.scan).toHaveBeenCalledTimes(2);
    expect(mockClient.del).toHaveBeenCalledTimes(2);
    expect(result).toBe(true);
  });

  it('does not call del when SCAN returns no keys', async () => {
    redis.isReady.mockReturnValue(true);
    mockClient.scan.mockResolvedValueOnce({ cursor: 0, keys: [] });

    const result = await cache.invalidatePattern('nonexistent:*');

    expect(mockClient.del).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('returns false when Redis throws during SCAN', async () => {
    redis.isReady.mockReturnValue(true);
    mockClient.scan.mockRejectedValue(new Error('Scan error'));

    const result = await cache.invalidatePattern('dashboard:*');

    expect(result).toBe(false);
  });
});
