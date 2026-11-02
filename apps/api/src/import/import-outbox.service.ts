import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateWordDto } from '../words/dto/create-word.dto.js';
import { errorMessage } from '../common/utils/error-message.js';
import type { ImportQueueService } from './import-queue.service.js';

type OutboxJobType = 'import' | 'addWords';

type OutboxDb = {
  import_outbox: {
    create: (args: { data: Prisma.import_outboxUncheckedCreateInput }) => Promise<unknown>;
  };
};

const RELAY_INTERVAL_MS = 5_000;
const RELAY_BATCH = 20;
/**
 * The request publishes immediately, then deletes the row. The relay waits so it does not
 * publish that same row while the request is still waiting for the broker.
 */
const RELAY_GRACE_MS = 15_000;
/** Longer than a broker confirm. A crashed worker's row can be claimed again after this. */
const CLAIM_SECONDS = 30;

@Injectable()
export class ImportOutboxService {
  private readonly logger = new Logger(ImportOutboxService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;

  constructor(private readonly prisma: PrismaService) {}

  add(
    entry: {
      jobId: string;
      userId: string;
      packageId: number;
      type: OutboxJobType;
      fileName?: string;
      wordCount: number;
      words: CreateWordDto[];
    },
    db: OutboxDb = this.prisma,
  ) {
    return db.import_outbox.create({
      data: {
        job_id: entry.jobId,
        user_id: entry.userId,
        package_id: entry.packageId,
        type: entry.type,
        file_name: entry.fileName?.slice(0, 255),
        word_count: entry.wordCount,
        payload: entry.words as unknown as Prisma.InputJsonValue,
        created_at: new Date(),
      },
    });
  }

  pending(limit = RELAY_BATCH) {
    return this.prisma.import_outbox.findMany({
      where: { created_at: { lt: new Date(Date.now() - RELAY_GRACE_MS) } },
      orderBy: { created_at: 'asc' },
      take: limit,
    });
  }

  remove(jobId: string) {
    return this.prisma.import_outbox.deleteMany({ where: { job_id: jobId } });
  }

  findOwned(jobId: string, userId: string) {
    return this.prisma.import_outbox.findFirst({
      where: { job_id: jobId, user_id: userId },
    });
  }

  /** Publishes stored jobs until the broker confirms each one. One flush at a time. */
  startRelay(publish: ImportQueueService['publish']): void {
    if (this.timer) return;
    const flush = () => {
      if (this.flushing) return;
      this.flushing = true;
      void this.flush(publish)
        .catch((err: unknown) => this.logger.warn(`Outbox relay failed: ${errorMessage(err)}`))
        .finally(() => {
          this.flushing = false;
        });
    };
    flush();
    this.timer = setInterval(flush, RELAY_INTERVAL_MS);
    this.timer.unref();
  }

  stopRelay(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  private async flush(publish: ImportQueueService['publish']): Promise<void> {
    const rows = await this.pending();
    for (const row of rows) {
      const claimedAt = await this.claim(row.job_id);
      if (!claimedAt) continue;
      const published = await publish({
        jobId: row.job_id,
        wordsData: row.payload as unknown as CreateWordDto[],
        packageId: row.package_id,
        userId: row.user_id,
      }).catch(() => false);
      if (published) await this.remove(row.job_id);
      else await this.release(row.job_id, claimedAt);
    }
  }

  /**
   * The time this worker stored, or null when another worker holds the row.
   * The update and the read share one transaction, so the row stays locked until the time is read.
   */
  private claim(jobId: string): Promise<Date | null> {
    return this.prisma.$transaction(async (tx) => {
      const won = await tx.$executeRaw`
        UPDATE import_outbox
        SET claimed_at = NOW()
        WHERE job_id = ${jobId}
          AND (claimed_at IS NULL OR claimed_at < DATE_SUB(NOW(), INTERVAL ${CLAIM_SECONDS} SECOND))
      `;
      if (won !== 1) return null;
      const row = await tx.import_outbox.findUnique({
        where: { job_id: jobId },
        select: { claimed_at: true },
      });
      return row?.claimed_at ?? null;
    });
  }

  /** Drops only the claim this worker took. A claim stored later stays. */
  private release(jobId: string, claimedAt: Date) {
    return this.prisma.import_outbox.updateMany({
      where: { job_id: jobId, claimed_at: claimedAt },
      data: { claimed_at: null },
    });
  }
}
