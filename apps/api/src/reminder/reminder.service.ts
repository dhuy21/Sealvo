import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { learning_level, word_details_type } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import { EmailQueueService } from '../email/email-queue.service.js';
import { dueWhereConditions, startOfToday } from '../learning/spaced-repetition.js';

const PREVIEW_LIMIT = 5;
const UNVERIFIED_USER_RETENTION_DAYS = 3;
const VERIFICATION_RETENTION_DAYS = 15;

/** mail.hbs uses the raw DB values (`0`, `ph.v`), not the Prisma enum names. */
const LEVEL_DB_VALUE: Record<learning_level, string> = {
  x: 'x',
  level_0: '0',
  level_1: '1',
  level_2: '2',
  v: 'v',
};

interface DueSummary {
  total: number;
  preview: { detailId: number; level: learning_level }[];
}

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly emailQueue: EmailQueueService,
    private readonly config: ConfigService,
  ) {}

  /** Email every user who has words due today (source: ReminderController.reminder) */
  async sendReminders(): Promise<{ sent: number; failed: number }> {
    const dueByUser = await this.findDueWordsByUser();
    if (dueByUser.size === 0) return { sent: 0, failed: 0 };

    const previewIds = [...dueByUser.values()].flatMap((s) => s.preview.map((p) => p.detailId));
    const [users, details] = await Promise.all([
      this.prisma.users.findMany({
        where: { id: { in: [...dueByUser.keys()] } },
        select: { id: true, email: true, username: true, streak: true },
      }),
      this.prisma.word_details.findMany({
        where: { detail_id: { in: previewIds } },
        include: { words: true },
      }),
    ]);
    const detailsById = new Map(details.map((d) => [d.detail_id, d]));

    let sent = 0;
    let failed = 0;
    for (const user of users) {
      const summary = dueByUser.get(user.id)!;
      const words = summary.preview.flatMap(({ detailId, level }) => {
        const detail = detailsById.get(detailId);
        return detail ? [this.toTemplateWord(detail, level)] : [];
      });

      const content = this.emailService.compileTemplate('mail.hbs', {
        user: { username: user.username },
        wordCount: summary.total,
        wordsShown: words.length,
        hasMoreWords: summary.total > PREVIEW_LIMIT,
        words,
        streak: this.toTemplateStreak(user.streak, summary.total),
        baseUrl: this.config.get<string>('FRONTEND_URL'),
      });

      const ok = await this.emailQueue.enqueue({
        to: user.email,
        content,
        subject: 'Révision quotidienne - SealVo',
      });
      if (ok) {
        sent++;
      } else {
        failed++;
        this.logger.warn(`Failed to enqueue reminder for user ${user.id}`);
      }
    }

    return { sent, failed };
  }

  /** Delete stale verification tokens and never-verified accounts (source: ReminderController._runCleanup) */
  async cleanupExpired(): Promise<void> {
    try {
      await this.prisma.email_verification.deleteMany({
        where: { created_at: { lt: this.retentionCutoff(VERIFICATION_RETENTION_DAYS) } },
      });
      await this.prisma.users.deleteMany({
        where: {
          is_verified: false,
          created_at: { lt: this.retentionCutoff(UNVERIFIED_USER_RETENTION_DAYS) },
        },
      });
    } catch (err) {
      this.logger.error(`Cleanup failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private async findDueWordsByUser(): Promise<Map<string, DueSummary>> {
    const rows = await this.prisma.learning.findMany({
      where: { packages: { is_active: true }, OR: dueWhereConditions() },
      select: { detail_id: true, level: true, packages: { select: { user_id: true } } },
    });

    const byUser = new Map<string, DueSummary>();
    for (const row of rows) {
      const userId = row.packages.user_id;
      const summary = byUser.get(userId) ?? { total: 0, preview: [] };
      summary.total++;
      if (summary.preview.length < PREVIEW_LIMIT) {
        summary.preview.push({ detailId: row.detail_id, level: row.level });
      }
      byUser.set(userId, summary);
    }
    return byUser;
  }

  /** Same rule as the old SQL: DATE(created_at) + INTERVAL n DAY <= CURDATE() */
  private retentionCutoff(days: number): Date {
    const cutoff = startOfToday();
    cutoff.setDate(cutoff.getDate() + 1 - days);
    return cutoff;
  }

  private toTemplateWord(
    detail: {
      type: word_details_type;
      meaning: string;
      pronunciation: string | null;
      example: string | null;
      words: { word: string };
    },
    level: learning_level,
  ) {
    const dbLevel = LEVEL_DB_VALUE[level];
    return {
      word: detail.words.word,
      type: detail.type === 'ph_v' ? 'ph.v' : detail.type,
      meaning: detail.meaning,
      pronunciation: detail.pronunciation,
      example: detail.example,
      level: dbLevel,
      isLevel0: dbLevel === 'x',
      isLevel1: dbLevel === '0',
      isLevel2: dbLevel === '1',
      isLevel3: dbLevel === '2',
      isLevel4: dbLevel === 'v',
    };
  }

  private toTemplateStreak(currentStreak: number, totalWords: number) {
    return {
      currentStreak,
      longestStreak: currentStreak,
      isAtRisk: currentStreak > 0 && totalWords > 0,
      isOnFire: currentStreak >= 7,
      isGood: currentStreak >= 3 && currentStreak < 7,
    };
  }
}
