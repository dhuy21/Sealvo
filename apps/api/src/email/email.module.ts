import { Module } from '@nestjs/common';
import { EmailService } from './email.service.js';
import { EmailQueueService } from './email-queue.service.js';

@Module({
  providers: [EmailService, EmailQueueService],
  exports: [EmailService, EmailQueueService],
})
export class EmailModule {}
