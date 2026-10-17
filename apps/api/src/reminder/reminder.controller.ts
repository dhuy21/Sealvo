import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { THROTTLE, Throttled } from '../common/throttler/throttle-policies.js';
import { CronSecretGuard } from '../auth/guards/cron-secret.guard.js';
import { MaintenanceService } from '../maintenance/maintenance.service.js';
import { ReminderService } from './reminder.service.js';

@ApiExcludeController()
@Controller('api/reminder')
@UseGuards(CronSecretGuard)
export class ReminderController {
  constructor(
    private readonly reminderService: ReminderService,
    private readonly maintenance: MaintenanceService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttled(THROTTLE.REMINDER_EMAIL)
  async triggerReminder() {
    const { sent, failed, skipped } = await this.reminderService.sendReminders();
    await this.maintenance.cleanupExpired();

    return {
      success: true,
      message: skipped
        ? 'Rappels déjà envoyés cette heure-ci.'
        : `Rappels traités : ${sent} envoyé(s), ${failed} échoué(s).`,
      sent,
      failed,
    };
  }
}
