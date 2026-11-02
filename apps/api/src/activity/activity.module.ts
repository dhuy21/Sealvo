import { Module } from '@nestjs/common';
import { ActivityController } from './activity.controller.js';
import { ActivityLogService } from './activity-log.service.js';
import { ActivityQueryService } from './activity-query.service.js';

@Module({
  controllers: [ActivityController],
  providers: [ActivityLogService, ActivityQueryService],
  exports: [ActivityLogService],
})
export class ActivityModule {}
