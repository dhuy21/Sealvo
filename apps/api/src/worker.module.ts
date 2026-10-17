import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateWorkerEnv } from './config/env.validation.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RabbitmqModule } from './rabbitmq/rabbitmq.module.js';
import { RedisModule } from './redis/redis.module.js';
import { EmailModule } from './email/email.module.js';
import { WordsCoreModule } from './words/words-core.module.js';
import { ImportQueueService } from './import/import-queue.service.js';
import { JobTrackerService } from './import/job-tracker.service.js';

/** Queue consumers only: ImportModule would also bring its HTTP controllers and upload services. */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
      validate: validateWorkerEnv,
    }),
    PrismaModule,
    RabbitmqModule,
    RedisModule,
    EmailModule,
    WordsCoreModule,
  ],
  providers: [ImportQueueService, JobTrackerService],
})
export class WorkerModule {}
