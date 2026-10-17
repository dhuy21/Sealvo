import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { THROTTLE, Throttled } from '../common/throttler/throttle-policies.js';
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
  @Throttled(THROTTLE.REMINDER_EMAIL)
  @ApiOperation({ summary: "Send the daily reminder email to the current user's own address" })
  @ApiResponse({ status: 200, description: 'Email enqueued, or no words due today' })
  @ApiResponse({ status: 500, description: 'Email could not be enqueued' })
  async sendTest(@CurrentUser('id') userId: string) {
    const { message } = await this.reminderService.sendTestReminder(userId);
    return { success: true, message };
  }
}
