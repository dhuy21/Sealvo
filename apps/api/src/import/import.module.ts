import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module.js';
import { WordsCoreModule } from '../words/words-core.module.js';
import { JobTrackerService } from './job-tracker.service.js';
import { ImportQueueService } from './import-queue.service.js';
import { BulkWordsService } from './bulk-words.service.js';
import { ImportOutboxService } from './import-outbox.service.js';
import { JobController } from './job.controller.js';
import { ImportController } from './import.controller.js';
import { ImportService } from './import.service.js';

@Module({
  imports: [WordsCoreModule, ActivityModule],
  controllers: [JobController, ImportController],
  providers: [
    JobTrackerService,
    ImportQueueService,
    BulkWordsService,
    ImportService,
    ImportOutboxService,
  ],
  exports: [JobTrackerService, ImportQueueService, BulkWordsService, ImportOutboxService],
})
export class ImportModule {}
