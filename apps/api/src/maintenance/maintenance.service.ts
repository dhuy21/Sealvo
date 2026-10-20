import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { daysCutoff } from '../common/domain/spaced-repetition.js';
import { errorMessage } from '../common/utils/error-message.js';

const UNVERIFIED_USER_RETENTION_DAYS = 3;
const VERIFICATION_RETENTION_DAYS = 15;
/** Far longer than a queued import job can be redelivered */
const APPLIED_JOB_RETENTION_DAYS = 7;

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Delete stale verification tokens, never-verified accounts and expired rows. Never throws. */
  async cleanupExpired(): Promise<void> {
    const now = new Date();
    const tasks: [string, () => Promise<unknown>][] = [
      [
        'email_verification',
        () =>
          this.prisma.email_verification.deleteMany({
            where: { created_at: { lt: daysCutoff(VERIFICATION_RETENTION_DAYS) } },
          }),
      ],
      [
        'unverified users',
        () =>
          this.prisma.users.deleteMany({
            where: {
              is_verified: false,
              created_at: { lt: daysCutoff(UNVERIFIED_USER_RETENTION_DAYS) },
            },
          }),
      ],
      [
        'refresh_sessions',
        () => this.prisma.refresh_sessions.deleteMany({ where: { expires_at: { lt: now } } }),
      ],
      [
        'password_reset_tokens',
        () => this.prisma.password_reset_tokens.deleteMany({ where: { expires_at: { lt: now } } }),
      ],
      [
        'applied_jobs',
        () =>
          this.prisma.applied_jobs.deleteMany({
            where: { created_at: { lt: daysCutoff(APPLIED_JOB_RETENTION_DAYS) } },
          }),
      ],
    ];

    for (const [name, run] of tasks) {
      try {
        await run();
      } catch (err) {
        this.logger.error(`Cleanup of ${name} failed: ${errorMessage(err)}`);
      }
    }
  }
}
