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
import { REDIS_KEYS } from '../redis/cache-keys.constants.js';

export interface JobMeta {
  /** Owner: only they can read the job or follow its events */
  userId?: string;
  packageId?: string;
  wordCount?: number;
}

export interface Job {
  id: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  progress: { current: number; total: number; phase: string } | null;
  result: Record<string, unknown> | null;
  error: string | null;
  meta: JobMeta;
  createdAt: number;
  updatedAt: number;
}

export const isFinished = (status: Job['status']) => status === 'completed' || status === 'failed';

@Injectable()
export class JobTrackerService implements OnModuleDestroy {
  private readonly logger = new Logger(JobTrackerService.name);
  private subscriber: Promise<RedisClientType | null> | null = null;

  constructor(private readonly redis: RedisService) {}

  async create(type: string, meta: JobMeta = {}): Promise<Job | null> {
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
      await client.set(REDIS_KEYS.job(id), JSON.stringify(job), { EX: JOB_TTL_SECONDS });
      if (meta.userId) {
        await client.sAdd(REDIS_KEYS.userJobs(meta.userId), id);
        await client.expire(REDIS_KEYS.userJobs(meta.userId), JOB_TTL_SECONDS);
      }
      await client.publish(REDIS_KEYS.jobEvents(id), JSON.stringify(job));
      return job;
    } catch {
      return null;
    }
  }

  async get(id: string): Promise<Job | null> {
    if (!this.redis.isReady()) return null;
    try {
      const raw = await this.redis.getClient()!.get(REDIS_KEYS.job(id));
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
  async subscribe(id: string, onUpdate: (job: Job) => void): Promise<(() => Promise<void>) | null> {
    const subscriber = await this.getSubscriber();
    if (!subscriber) return null;

    const channel = REDIS_KEYS.jobEvents(id);
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
      const raw = await client.get(REDIS_KEYS.job(id));
      if (!raw) return false;
      const job = JSON.parse(raw) as Job;
      Object.assign(job, fields, { updatedAt: Date.now() });
      const ttl = await client.ttl(REDIS_KEYS.job(id));
      const serialized = JSON.stringify(job);
      await client.set(REDIS_KEYS.job(id), serialized, { EX: ttl > 0 ? ttl : JOB_TTL_SECONDS });
      client.publish(REDIS_KEYS.jobEvents(id), serialized).catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  async remove(id: string): Promise<boolean> {
    if (!this.redis.isReady()) return false;
    try {
      const client = this.redis.getClient()!;
      const raw = await client.get(REDIS_KEYS.job(id));
      if (raw) {
        const job = JSON.parse(raw) as Job;
        if (job.meta?.userId) {
          await client.sRem(REDIS_KEYS.userJobs(job.meta.userId), id);
        }
      }
      await client.del(REDIS_KEYS.job(id));
      return true;
    } catch {
      return false;
    }
  }

  async getActiveByUser(userId: string): Promise<Job[]> {
    if (!this.redis.isReady() || !userId) return [];
    try {
      const client = this.redis.getClient()!;
      const ids = await client.sMembers(REDIS_KEYS.userJobs(userId));
      if (!ids || ids.length === 0) return [];
      const jobs: Job[] = [];
      for (const id of ids) {
        const job = await this.get(id);
        if (job && !isFinished(job.status)) {
          jobs.push(job);
        } else {
          client.sRem(REDIS_KEYS.userJobs(userId), id).catch(() => {});
        }
      }
      return jobs;
    } catch {
      return [];
    }
  }
}
