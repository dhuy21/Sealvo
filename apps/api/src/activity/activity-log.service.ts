import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import type { activity_phase, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

/** Events that finish inside the request. Import and bulk add-words come later. */
export type InstantActivityType =
  'login' | 'password_change' | 'email_change' | 'package_create' | 'package_delete';

export type JobActivityType = 'import' | 'add_words';

const clip = (value: string | undefined, max: number) =>
  value === undefined ? undefined : value.slice(0, max);

export type ActivityDb = {
  user_activities: {
    create: (args: { data: Prisma.user_activitiesUncheckedCreateInput }) => Promise<unknown>;
  };
};

@Injectable()
export class ActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  async succeeded(
    db: ActivityDb,
    entry: {
      userId: string;
      type: InstantActivityType;
      packageId?: number;
      packageName?: string;
    },
  ): Promise<void> {
    const now = new Date();
    await db.user_activities.create({
      data: {
        id: randomUUID(),
        user_id: entry.userId,
        type: entry.type,
        status: 'succeeded',
        occurred_at: now,
        updated_at: now,
        package_id: entry.packageId,
        package_name: entry.packageName,
      },
    });
  }

  /** A queued import or bulk add. The worker updates this same row. */
  async start(
    entry: {
      userId: string;
      type: JobActivityType;
      packageId: number;
      packageName: string | null;
      fileName?: string;
      wordCount: number;
      jobId: string;
    },
    db: ActivityDb = this.prisma,
  ): Promise<void> {
    const now = new Date();
    await db.user_activities.create({
      data: {
        id: randomUUID(),
        user_id: entry.userId,
        type: entry.type,
        status: 'running',
        occurred_at: now,
        updated_at: now,
        package_id: entry.packageId,
        package_name: entry.packageName,
        file_name: clip(entry.fileName, 255),
        word_count: entry.wordCount,
        error_count: 0,
        phase: 'parsing',
        progress_current: 0,
        job_id: entry.jobId,
      },
    });
  }

  /** Saved during the request: nothing left to watch. */
  async recordFinished(entry: {
    userId: string;
    type: JobActivityType;
    packageId: number;
    packageName: string | null;
    fileName?: string;
    wordCount: number;
  }): Promise<void> {
    const now = new Date();
    await this.prisma.user_activities.create({
      data: {
        id: randomUUID(),
        user_id: entry.userId,
        type: entry.type,
        status: 'succeeded',
        occurred_at: now,
        updated_at: now,
        package_id: entry.packageId,
        package_name: entry.packageName,
        file_name: clip(entry.fileName, 255),
        word_count: entry.wordCount,
        error_count: 0,
        phase: 'done',
        progress_current: entry.wordCount,
      },
    });
  }

  /** An import that failed before a job existed. Add-word failures are not recorded. */
  async recordImportFailed(entry: {
    userId: string;
    packageId: number;
    packageName: string | null;
    fileName?: string;
    wordCount: number;
    errorMessage: string;
  }): Promise<void> {
    const now = new Date();
    await this.prisma.user_activities.create({
      data: {
        id: randomUUID(),
        user_id: entry.userId,
        type: 'import',
        status: 'failed',
        occurred_at: now,
        updated_at: now,
        package_id: entry.packageId,
        package_name: entry.packageName,
        file_name: clip(entry.fileName, 255),
        word_count: entry.wordCount,
        error_count: 0,
        error_message: entry.errorMessage.slice(0, 255),
      },
    });
  }

  /** Drops the row when the job was not actually queued, so the synchronous save can write its own. */
  async discard(jobId: string): Promise<void> {
    await this.prisma.user_activities.deleteMany({ where: { job_id: jobId } });
  }

  async advance(
    jobId: string,
    progress: { phase: activity_phase; current: number; total: number },
  ): Promise<void> {
    await this.prisma.user_activities.updateMany({
      where: { job_id: jobId, status: 'running' },
      data: {
        phase: progress.phase,
        progress_current: progress.current,
        word_count: progress.total,
        updated_at: new Date(),
      },
    });
  }

  async finishJob(
    jobId: string,
    result: {
      status: 'succeeded' | 'failed';
      current?: number;
      total?: number;
      errorCount?: number;
      errorMessage?: string;
    },
  ): Promise<void> {
    await this.prisma.user_activities.updateMany({
      where: { job_id: jobId },
      data: {
        status: result.status,
        ...(result.status === 'succeeded' ? { phase: 'done' as const } : {}),
        ...(result.current !== undefined ? { progress_current: result.current } : {}),
        ...(result.total !== undefined ? { word_count: result.total } : {}),
        ...(result.errorCount !== undefined ? { error_count: result.errorCount } : {}),
        ...(result.errorMessage !== undefined
          ? { error_message: result.errorMessage.slice(0, 255) }
          : {}),
        updated_at: new Date(),
      },
    });
  }
}
