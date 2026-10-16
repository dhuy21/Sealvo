import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailQueueService } from '../email/email-queue.service.js';

/** Spaced repetition intervals (days) per level */
const INTERVALS: Record<string, number> = {
  x: 0,
  level_0: 2,
  level_1: 4,
  level_2: 10,
  v: 20,
};

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailQueue: EmailQueueService,
    private readonly config: ConfigService,
  ) {}

  /** Send reminder emails to all users who have words due today */
  async sendReminders(): Promise<{ sent: number; failed: number }> {
    const users = await this.prisma.users.findMany({
      where: { is_verified: true },
      select: { id: true, email: true, username: true },
    });

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      const dueCount = await this.countWordsDue(user.id);
      if (dueCount === 0) continue;

      const preview = await this.getWordPreview(user.id, 5);
      const html = this.buildEmailHtml(user.username, dueCount, preview);

      const ok = await this.emailQueue.enqueue({
        to: user.email,
        content: html,
        subject: 'Révision quotidienne - SealVo',
      });

      if (ok) {
        sent++;
      } else {
        failed++;
        this.logger.warn(`Failed to enqueue reminder for ${user.email}`);
      }
    }

    this.logger.log(`Reminders: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  }

  /** Count words due for review across all active packages */
  private async countWordsDue(userId: string): Promise<number> {
    const now = new Date();
    const conditions = Object.entries(INTERVALS).map(([level, days]) => {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - days);
      return { level: level as any, date_memorized: { lte: cutoff } };
    });

    return this.prisma.learning.count({
      where: {
        packages: { user_id: userId, is_active: true },
        OR: conditions,
      },
    });
  }

  /** Get a preview of words due (for the email) */
  private async getWordPreview(
    userId: string,
    limit: number,
  ): Promise<{ word: string; translation: string }[]> {
    const now = new Date();
    const conditions = Object.entries(INTERVALS).map(([level, days]) => {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - days);
      return { level: level as any, date_memorized: { lte: cutoff } };
    });

    const rows = await this.prisma.learning.findMany({
      where: {
        packages: { user_id: userId, is_active: true },
        OR: conditions,
      },
      include: { word_details: { select: { word: true, translation: true } } },
      take: limit,
    });

    return rows.map((r) => ({
      word: r.word_details?.word ?? '',
      translation: r.word_details?.translation ?? '',
    }));
  }

  /** Build reminder email HTML */
  private buildEmailHtml(
    username: string,
    totalDue: number,
    preview: { word: string; translation: string }[],
  ): string {
    const wordRows = preview
      .map((w) => `<tr><td>${w.word}</td><td>${w.translation}</td></tr>`)
      .join('');

    return `<h2>Bonjour ${username} 👋</h2>
<p>Vous avez <strong>${totalDue} mot(s)</strong> à réviser aujourd'hui !</p>
<table border="1" cellpadding="8" cellspacing="0">
  <tr><th>Mot</th><th>Traduction</th></tr>
  ${wordRows}
</table>
${totalDue > preview.length ? `<p>...et ${totalDue - preview.length} de plus.</p>` : ''}
<p><a href="${this.config.get<string>('FRONTEND_URL') ?? 'https://www.sealvo.it.com'}">Réviser maintenant →</a></p>`;
  }

  /** Cleanup: delete expired verification tokens + unverified users */
  async cleanupExpired(): Promise<void> {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);

      await this.prisma.email_verification.deleteMany({
        where: { expires_at: { lt: new Date() } },
      });

      await this.prisma.users.deleteMany({
        where: { is_verified: false, created_at: { lt: cutoff } },
      });
    } catch (err) {
      this.logger.warn(
        `Cleanup failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
