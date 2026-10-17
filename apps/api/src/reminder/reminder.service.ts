import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import type { learning_level, word_details_type } from '@prisma/client';
import { levelLabel, wordTypeToDb } from '@sealvo/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { appConfig, type AppConfig } from '../config/app.config.js';
import { EmailService } from '../email/email.service.js';
import { EmailQueueService } from '../email/email-queue.service.js';
import { CacheService } from '../redis/cache.service.js';
import { CACHE_KEYS, CACHE_TTL } from '../redis/cache-keys.constants.js';
import { dueWhereConditions, startOfToday } from '../learning/spaced-repetition.js';

const PREVIEW_LIMIT = 5;
const UNVERIFIED_USER_RETENTION_DAYS = 3;
const VERIFICATION_RETENTION_DAYS = 15;
/** Far longer than a queued import job can be redelivered */
const APPLIED_JOB_RETENTION_DAYS = 7;

interface DueSummary {
  total: number;
  preview: { detailId: number; level: learning_level }[];
}

interface ReminderUser {
  id: string;
  email: string;
  username: string;
  streak: number;
}

type PreviewDetail = Parameters<ReminderService['toTemplateWord']>[0];

const USER_SELECT = { id: true, email: true, username: true, streak: true } as const;

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly emailQueue: EmailQueueService,
    private readonly cache: CacheService,
    @Inject(appConfig.KEY) private readonly app: AppConfig,
  ) {}

  /**
   * Email every user who has words due today. A scheduled run and the scheduler's catch-up can land
   * in the same hour: only the first one sends (without Redis, every run sends).
   */
  async sendReminders(): Promise<{ sent: number; failed: number; skipped?: true }> {
    const hour = new Date().toISOString().slice(0, 13);
    if ((await this.cache.setNX(CACHE_KEYS.reminderRun(hour), 1, CACHE_TTL.REMINDER_RUN)) === false) {
      this.logger.warn(`Reminders already sent this hour (${hour} UTC) — skipping.`);
      return { sent: 0, failed: 0, skipped: true };
    }

    const dueByUser = await this.findDueWordsByUser();
    if (dueByUser.size === 0) return { sent: 0, failed: 0 };

    const previewIds = [...dueByUser.values()].flatMap((s) => s.preview.map((p) => p.detailId));
    const [users, details] = await Promise.all([
      this.prisma.users.findMany({
        where: { id: { in: [...dueByUser.keys()] } },
        select: USER_SELECT,
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
      const ok = await this.enqueueReminder(user, dueByUser.get(user.id)!, detailsById);
      if (ok) {
        sent++;
      } else {
        failed++;
        this.logger.warn(`Failed to enqueue reminder for user ${user.id}`);
      }
    }

    return { sent, failed };
  }

  /** Email the current user their own reminder */
  async sendTestReminder(userId: string): Promise<{ message: string }> {
    const summary = (await this.findDueWordsByUser(userId)).get(userId);
    if (!summary) return { message: "Aucun mot à réviser aujourd'hui" };

    const [user, details] = await Promise.all([
      this.prisma.users.findUniqueOrThrow({ where: { id: userId }, select: USER_SELECT }),
      this.prisma.word_details.findMany({
        where: { detail_id: { in: summary.preview.map((p) => p.detailId) } },
        include: { words: true },
      }),
    ]);

    const ok = await this.enqueueReminder(
      user,
      summary,
      new Map(details.map((d) => [d.detail_id, d])),
    );
    if (!ok) throw new InternalServerErrorException("Échec de l'envoi de l'email");

    return { message: "L'email a été envoyé pour tester" };
  }

  /** Delete stale verification tokens and never-verified accounts */
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
      const now = new Date();
      await this.prisma.refresh_sessions.deleteMany({ where: { expires_at: { lt: now } } });
      await this.prisma.password_reset_tokens.deleteMany({ where: { expires_at: { lt: now } } });
      await this.prisma.applied_jobs.deleteMany({
        where: { created_at: { lt: this.retentionCutoff(APPLIED_JOB_RETENTION_DAYS) } },
      });
    } catch (err) {
      this.logger.error(`Cleanup failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private enqueueReminder(
    user: ReminderUser,
    summary: DueSummary,
    detailsById: Map<number, PreviewDetail>,
  ): Promise<boolean> {
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
      baseUrl: this.app.frontendUrl,
    });

    return this.emailQueue.enqueue({
      to: user.email,
      content,
      subject: 'Révision quotidienne - SealVo',
    });
  }

  private async findDueWordsByUser(userId?: string): Promise<Map<string, DueSummary>> {
    const rows = await this.prisma.learning.findMany({
      where: { packages: { is_active: true, user_id: userId }, OR: dueWhereConditions() },
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
    // mail.hbs uses the raw DB values (`0`, `ph.v`), not the Prisma enum names
    const dbLevel = levelLabel(level);
    return {
      word: detail.words.word,
      type: wordTypeToDb(detail.type),
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
