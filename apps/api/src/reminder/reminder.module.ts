import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { EmailModule } from '../email/email.module.js';
import { ReminderController } from './reminder.controller.js';
import { ReminderService } from './reminder.service.js';
import { TestReminderController } from './test-reminder.controller.js';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [ReminderController, TestReminderController],
  providers: [ReminderService],
})
export class ReminderModule {}
