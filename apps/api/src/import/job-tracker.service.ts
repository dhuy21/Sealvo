import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { type RedisClientType } from 'redis';
import { JOB_TTL_SECONDS } from '@sealvo/shared';
import { RedisService } from '../redis/redis.service.js';

const PREFIX = 'job:';
const CHANNEL_PREFIX = 'job-events:';
const USER_JOBS_PREFIX = 'user-jobs:';

export interface Job {
  id: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  progress: { current: number; total: number; phase: string } | null;
  result: Record<string, unknown> | null;
  error: string | null;
  meta: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export const isFinished = (status: Job['status']) => status === 'completed' || status === 'failed';

@Injectable()
export class JobTrackerService implements OnModuleDestroy {
  private readonly logger = new Logger(JobTrackerService.name);
  private subscriber: Promise<RedisClientType | null> | null = null;

  constructor(private readonly redis: RedisService) {}

  async create(type: string, meta: Record<string, unknown> = {}): Promise<Job | null> {
    if (!this.redis.isReady()) return null;
    const id = randomUUID();
    const job: Job = {
      id,
      type,
      status: 'pending',
      progress: null,
      result: null,
      error: null,
      meta,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      const client = this.redis.getClient()!;
      await client.set(PREFIX + id, JSON.stringify(job), { EX: JOB_TTL_SECONDS });
      if (meta.userId) {
        await client.sAdd(USER_JOBS_PREFIX + String(meta.userId), id);
        await client.expire(USER_JOBS_PREFIX + String(meta.userId), JOB_TTL_SECONDS);
      }
      await client.publish(CHANNEL_PREFIX + id, JSON.stringify(job));
      return job;
    } catch {
      return null;
    }
  }

  async get(id: string): Promise<Job | null> {
    if (!this.redis.isReady()) return null;
    try {
      const raw = await this.redis.getClient()!.get(PREFIX + id);
      return raw ? (JSON.parse(raw) as Job) : null;
    } catch {
      return null;
    }
  }

  /** The job, if it belongs to the user: 404 when missing (or Redis is down), 403 otherwise */
  async getOwned(id: string, userId: string): Promise<Job> {
    const job = await this.get(id);
    if (!job) throw new NotFoundException('Job not found.');
    if (job.meta?.userId !== userId) throw new ForbiddenException();
    return job;
  }

  /**
   * Calls onUpdate with every update published for the job, until the returned unsubscribe is called.
   * Null when Redis Pub/Sub is unavailable.
   */
  async subscribe(
    id: string,
    onUpdate: (job: Job) => void,
  ): Promise<(() => Promise<void>) | null> {
    const subscriber = await this.getSubscriber();
    if (!subscriber) return null;

    const channel = CHANNEL_PREFIX + id;
    let closed = false;
    const listener = (message: string) => {
      if (closed) return;
      try {
        onUpdate(JSON.parse(message) as Job);
      } catch {
        this.logger.warn(`Ignoring malformed update for job ${id}.`);
      }
    };

    try {
      await subscriber.subscribe(channel, listener);
    } catch {
      if (!subscriber.isOpen) this.subscriber = null;
      return null;
    }
    return async () => {
      if (closed) return;
      closed = true;
      // Only this listener: other streams of the same job keep theirs
      await subscriber.unsubscribe(channel, listener).catch(() => {});
    };
  }

  async onModuleDestroy() {
    const subscriber = await this.subscriber;
    this.subscriber = null;
    if (!subscriber) return;
    try {
      await subscriber.quit();
    } catch {
      subscriber.destroy();
    }
  }

  /** One Pub/Sub connection shared by every stream of the process, opened on first use */
  private getSubscriber(): Promise<RedisClientType | null> {
    this.subscriber ??= this.redis.createSubscriber().then((subscriber) => {
      if (!subscriber) this.subscriber = null;
      return subscriber;
    });
    return this.subscriber;
  }

  async update(id: string, fields: Partial<Job>): Promise<boolean> {
    if (!this.redis.isReady()) return false;
    try {
      const client = this.redis.getClient()!;
      const raw = await client.get(PREFIX + id);
      if (!raw) return false;
      const job = JSON.parse(raw) as Job;
      Object.assign(job, fields, { updatedAt: Date.now() });
      const ttl = await client.ttl(PREFIX + id);
      const serialized = JSON.stringify(job);
      await client.set(PREFIX + id, serialized, { EX: ttl > 0 ? ttl : JOB_TTL_SECONDS });
      client.publish(CHANNEL_PREFIX + id, serialized).catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  async remove(id: string): Promise<boolean> {
    if (!this.redis.isReady()) return false;
    try {
      const client = this.redis.getClient()!;
      const raw = await client.get(PREFIX + id);
      if (raw) {
        const job = JSON.parse(raw) as Job;
        if (job.meta?.userId) {
          await client.sRem(USER_JOBS_PREFIX + String(job.meta.userId), id);
        }
      }
      await client.del(PREFIX + id);
      return true;
    } catch {
      return false;
    }
  }

  async getActiveByUser(userId: string): Promise<Job[]> {
    if (!this.redis.isReady() || !userId) return [];
    try {
      const client = this.redis.getClient()!;
      const ids = await client.sMembers(USER_JOBS_PREFIX + userId);
      if (!ids || ids.length === 0) return [];
      const jobs: Job[] = [];
      for (const id of ids) {
        const job = await this.get(id);
        if (job && !isFinished(job.status)) {
          jobs.push(job);
        } else {
          client.sRem(USER_JOBS_PREFIX + userId, id).catch(() => {});
        }
      }
      return jobs;
    } catch {
      return [];
    }
  }
}
