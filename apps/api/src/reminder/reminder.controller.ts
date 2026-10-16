import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ThrottleMessage } from '../common/decorators/throttle-message.decorator.js';
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
  @ThrottleMessage("Trop d'emails envoyés. Réessayez dans 1 heure.")
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
