import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CronSecretGuard } from '../auth/guards/cron-secret.guard.js';
import { ReminderService } from './reminder.service.js';

@ApiExcludeController()
@Controller('api/reminder')
@UseGuards(CronSecretGuard)
export class ReminderController {
  constructor(private readonly reminderService: ReminderService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60 * 60_000, limit: 3 } })
  async triggerReminder() {
    const { sent, failed } = await this.reminderService.sendReminders();
    await this.reminderService.cleanupExpired();

    return {
      success: true,
      message: `Rappels traités : ${sent} envoyé(s), ${failed} échoué(s).`,
      sent,
      failed,
    };
  }
}
