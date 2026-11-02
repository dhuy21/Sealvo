import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RedisService } from '../redis/redis.service.js';
import { readHeartbeats, startHeartbeat } from './heartbeat.js';

function fakeRedis(ready = true) {
  const store = new Map<string, string>();
  const sets = new Map<string, Set<string>>();
  const client = {
    set: vi.fn(async (key: string, value: string) => void store.set(key, value)),
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    sAdd: vi.fn(async (key: string, member: string) => {
      const set = sets.get(key) ?? new Set<string>();
      set.add(member);
      sets.set(key, set);
      return 1;
    }),
    sMembers: vi.fn(async (key: string) => [...(sets.get(key) ?? [])]),
    sRem: vi.fn(async (key: string, member: string) => {
      sets.get(key)?.delete(member);
      return 1;
    }),
  };
  const redis = { isReady: () => ready, getClient: () => client } as unknown as RedisService;
  return { redis, client, store, sets };
}

describe('heartbeat', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('reports the commit of a running process, with an expiry', async () => {
    process.env.HOSTNAME = 'w1';
    const { redis, client } = fakeRedis();
    const stop = startHeartbeat(redis, 'worker', 'abc123');
    await vi.advanceTimersByTimeAsync(0);

    expect(client.sAdd).toHaveBeenCalledWith('heartbeat:worker:ids', 'w1');
    expect(client.set).toHaveBeenCalledWith('heartbeat:worker:w1', 'abc123', { EX: 45 });
    expect(await readHeartbeats(redis)).toEqual({ worker: 'abc123', scheduler: null });
    stop();
  });

  it('reports nothing while worker copies run different commits', async () => {
    process.env.HOSTNAME = 'w1';
    const { redis } = fakeRedis();
    const first = startHeartbeat(redis, 'worker', 'new-sha');
    process.env.HOSTNAME = 'w2';
    const second = startHeartbeat(redis, 'worker', 'old-sha');
    await vi.advanceTimersByTimeAsync(0);

    expect(await readHeartbeats(redis)).toEqual({ worker: null, scheduler: null });
    first();
    second();
  });

  it('beats again on the interval until stopped', async () => {
    const { redis, client } = fakeRedis();
    const stop = startHeartbeat(redis, 'scheduler', 'abc123');
    await vi.advanceTimersByTimeAsync(15_000);
    expect(client.set).toHaveBeenCalledTimes(2);

    stop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(client.set).toHaveBeenCalledTimes(2);
  });

  it('keeps a single scheduler beat on the shared key', async () => {
    const { redis, client } = fakeRedis();
    const stop = startHeartbeat(redis, 'scheduler', 'abc123');
    await vi.advanceTimersByTimeAsync(0);

    expect(client.set).toHaveBeenCalledWith('heartbeat:scheduler', 'abc123', { EX: 45 });
    expect(client.sAdd).not.toHaveBeenCalled();
    stop();
  });

  it('reports nothing while Redis is down', async () => {
    const { redis, client } = fakeRedis(false);
    startHeartbeat(redis, 'worker', 'abc123')();

    expect(client.set).not.toHaveBeenCalled();
    expect(await readHeartbeats(redis)).toEqual({ worker: null, scheduler: null });
  });

  it('reports nothing rather than wait for a Redis that does not answer', async () => {
    const { redis, client } = fakeRedis();
    client.get.mockImplementation(() => new Promise(() => {}));

    const read = readHeartbeats(redis);
    await vi.advanceTimersByTimeAsync(500);

    await expect(read).resolves.toEqual({ worker: null, scheduler: null });
  });
});
