import { Module } from '@nestjs/common';
import { WordsModule } from '../words/words.module.js';
import { JobTrackerService } from './job-tracker.service.js';
import { ImportQueueService } from './import-queue.service.js';
import { JobController } from './job.controller.js';

@Module({
  imports: [WordsModule],
  controllers: [JobController],
  providers: [JobTrackerService, ImportQueueService],
  exports: [JobTrackerService, ImportQueueService],
})
export class ImportModule {}
