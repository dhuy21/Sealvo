import { withTimeout } from '@sealvo/shared';
import type { RedisService } from '../redis/redis.service.js';

/** Processes without an HTTP server: they report the commit they run through Redis */
export const HEARTBEAT_PROCESSES = ['worker', 'scheduler'] as const;
export type HeartbeatProcess = (typeof HEARTBEAT_PROCESSES)[number];

const KEY_PREFIX = 'heartbeat:';
const INTERVAL_MS = 15_000;
/** A process that stops beating (crash loop, stopped) disappears after this */
const TTL_SECONDS = 45;
/** Read by GET /health: a stalled Redis must not slow the API's own health check */
const READ_TIMEOUT_MS = 500;

/** Writes the running commit now and every 15 s; returns the function that stops it */
export function startHeartbeat(redis: RedisService, name: HeartbeatProcess, version: string) {
  const beat = async () => {
    if (!redis.isReady()) return;
    try {
      await redis.getClient()!.set(KEY_PREFIX + name, version, { EX: TTL_SECONDS });
    } catch {
      /* the next beat retries */
    }
  };
  void beat();
  const timer = setInterval(() => void beat(), INTERVAL_MS);
  timer.unref();
  return () => clearInterval(timer);
}

/** The commit each process last reported, null when it is not running (or Redis is down) */
export async function readHeartbeats(
  redis: RedisService,
): Promise<Record<HeartbeatProcess, string | null>> {
  try {
    return await withTimeout(() => read(redis), READ_TIMEOUT_MS);
  } catch {
    return Object.fromEntries(HEARTBEAT_PROCESSES.map((name) => [name, null])) as Record<
      HeartbeatProcess,
      string | null
    >;
  }
}

async function read(redis: RedisService): Promise<Record<HeartbeatProcess, string | null>> {
  const entries = await Promise.all(
    HEARTBEAT_PROCESSES.map(async (name) => {
      if (!redis.isReady()) return [name, null] as const;
      try {
        return [name, await redis.getClient()!.get(KEY_PREFIX + name)] as const;
      } catch {
        return [name, null] as const;
      }
    }),
  );
  return Object.fromEntries(entries) as Record<HeartbeatProcess, string | null>;
}
