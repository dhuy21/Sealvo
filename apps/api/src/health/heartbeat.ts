import { withTimeout } from '@sealvo/shared';
import type { RedisService } from '../redis/redis.service.js';
import { REDIS_KEYS } from '../redis/cache-keys.constants.js';

/** Processes without an HTTP server: they report the commit they run through Redis */
export const HEARTBEAT_PROCESSES = ['worker', 'scheduler'] as const;
export type HeartbeatProcess = (typeof HEARTBEAT_PROCESSES)[number];

const INTERVAL_MS = 15_000;
/** A process that stops beating (crash loop, stopped) disappears after this */
const TTL_SECONDS = 45;
/** Read by GET /health: a stalled Redis must not slow the API's own health check */
const READ_TIMEOUT_MS = 500;

const workerInstanceId = () => process.env.RAILWAY_REPLICA_ID || process.env.HOSTNAME || 'worker';

/** Writes the running commit now and every 15 s; returns the function that stops it */
export function startHeartbeat(redis: RedisService, name: HeartbeatProcess, version: string) {
  const replicaId = name === 'worker' ? workerInstanceId() : null;
  const beat = async () => {
    if (!redis.isReady()) return;
    try {
      const client = redis.getClient()!;
      if (replicaId) {
        await client.sAdd(REDIS_KEYS.heartbeatReplicas(), replicaId);
        await client.set(REDIS_KEYS.heartbeatReplica(replicaId), version, { EX: TTL_SECONDS });
      } else {
        await client.set(REDIS_KEYS.heartbeat(name), version, { EX: TTL_SECONDS });
      }
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
        const value =
          name === 'worker'
            ? await readWorkers(redis)
            : await redis.getClient()!.get(REDIS_KEYS.heartbeat(name));
        return [name, value] as const;
      } catch {
        return [name, null] as const;
      }
    }),
  );
  return Object.fromEntries(entries) as Record<HeartbeatProcess, string | null>;
}

/** One commit when every live worker copy runs it. Null when they disagree or none are up. */
async function readWorkers(redis: RedisService): Promise<string | null> {
  const client = redis.getClient()!;
  const ids = await client.sMembers(REDIS_KEYS.heartbeatReplicas());
  const versions: string[] = [];
  for (const id of ids) {
    const value = await client.get(REDIS_KEYS.heartbeatReplica(id));
    if (value) versions.push(value);
    else await client.sRem(REDIS_KEYS.heartbeatReplicas(), id);
  }
  // A copy that has not picked up per-replica beats yet still writes the old key.
  const legacy = await client.get(REDIS_KEYS.heartbeat('worker'));
  if (legacy) versions.push(legacy);
  if (versions.length === 0) return null;
  return new Set(versions).size === 1 ? versions[0] : null;
}
