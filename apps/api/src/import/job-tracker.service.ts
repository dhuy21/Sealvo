import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from '../redis/redis.service.js';

const PREFIX = 'job:';
const CHANNEL_PREFIX = 'job-events:';
const USER_JOBS_PREFIX = 'user-jobs:';
const DEFAULT_TTL = 3600;

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

@Injectable()
export class JobTrackerService {
  private readonly logger = new Logger(JobTrackerService.name);

  /** Exposed for SSE subscriptions */
  readonly CHANNEL_PREFIX = CHANNEL_PREFIX;

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
      await client.set(PREFIX + id, JSON.stringify(job), { EX: DEFAULT_TTL });
      if (meta.userId) {
        await client.sAdd(USER_JOBS_PREFIX + String(meta.userId), id);
        await client.expire(USER_JOBS_PREFIX + String(meta.userId), DEFAULT_TTL);
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
      await client.set(PREFIX + id, serialized, { EX: ttl > 0 ? ttl : DEFAULT_TTL });
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
        if (job && job.status !== 'completed' && job.status !== 'failed') {
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
