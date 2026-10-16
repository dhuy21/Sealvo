import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ThrottleMessage } from '../common/decorators/throttle-message.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ReminderService } from './reminder.service.js';

@ApiTags('Reminder')
@Controller('reminder')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TestReminderController {
  constructor(private readonly reminderService: ReminderService) {}

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60 * 60_000, limit: 3 } })
  @ThrottleMessage("Trop d'emails envoyés. Réessayez dans 1 heure.")
  @ApiOperation({ summary: "Send the daily reminder email to the current user's own address" })
  @ApiResponse({ status: 200, description: 'Email enqueued, or no words due today' })
  @ApiResponse({ status: 500, description: 'Email could not be enqueued' })
  async sendTest(@CurrentUser('id') userId: string) {
    const { message } = await this.reminderService.sendTestReminder(userId);
    return { success: true, message };
  }
}
