import { Module } from '@nestjs/common';
import { WordsModule } from '../words/words.module.js';
import { JobTrackerService } from './job-tracker.service.js';
import { ImportQueueService } from './import-queue.service.js';
import { JobController } from './job.controller.js';
import { ImportController } from './import.controller.js';
import { ImportService } from './import.service.js';

@Module({
  imports: [WordsModule],
  controllers: [JobController, ImportController],
  providers: [JobTrackerService, ImportQueueService, ImportService],
  exports: [JobTrackerService, ImportQueueService],
})
export class ImportModule {}
