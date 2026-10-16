import {
  Controller,
  Post,
  Headers,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import { ReminderService } from './reminder.service.js';

@SkipThrottle()
@Controller('api/reminder')
export class ReminderController {
  private readonly logger = new Logger(ReminderController.name);

  constructor(
    private readonly reminderService: ReminderService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  async triggerReminder(@Headers('x-cron-secret') cronSecret?: string) {
    const expected = this.config.get<string>('CRON_SECRET');
    if (!expected || cronSecret !== expected) {
      throw new ForbiddenException('Invalid cron secret');
    }

    this.logger.log('Reminder triggered by scheduler');
    const result = await this.reminderService.sendReminders();
    await this.reminderService.cleanupExpired();

    return {
      success: true,
      message: `Rappels: ${result.sent} envoyé(s), ${result.failed} échoué(s).`,
      ...result,
    };
  }
}
