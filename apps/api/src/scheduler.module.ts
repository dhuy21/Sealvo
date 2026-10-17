import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateSchedulerEnv } from './config/env.validation.js';
import { RedisModule } from './redis/redis.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
      validate: validateSchedulerEnv,
    }),
    RedisModule,
  ],
})
export class SchedulerModule {}
