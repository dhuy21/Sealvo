import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateWorkerEnv } from './config/env.validation.js';
import { ENV_FILE } from './config/env-file.js';
import { buildConfig } from './config/build.config.js';
import { mailConfig } from './config/mail.config.js';
import { redisConfig } from './config/redis.config.js';
import { rabbitmqConfig } from './config/rabbitmq.config.js';
import { geminiConfig } from './config/gemini.config.js';
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
      envFilePath: ENV_FILE,
      expandVariables: true,
      validate: validateWorkerEnv,
      load: [buildConfig, mailConfig, redisConfig, rabbitmqConfig, geminiConfig],
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
