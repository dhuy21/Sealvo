import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateSchedulerEnv } from './config/env.validation.js';
import { ENV_FILE } from './config/env-file.js';
import { buildConfig } from './config/build.config.js';
import { redisConfig } from './config/redis.config.js';
import { schedulerConfig } from './config/scheduler.config.js';
import { RedisModule } from './redis/redis.module.js';
import { SchedulerService } from './scheduler/scheduler.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ENV_FILE,
      expandVariables: true,
      validate: validateSchedulerEnv,
      load: [buildConfig, redisConfig, schedulerConfig],
    }),
    RedisModule,
  ],
  providers: [SchedulerService],
})
export class SchedulerModule {}
