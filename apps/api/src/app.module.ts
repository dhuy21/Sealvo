import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, Reflector } from '@nestjs/core';
import { validateApiEnv } from './config/env.validation.js';
import { ENV_FILE } from './config/env-file.js';
import { appConfig } from './config/app.config.js';
import { buildConfig } from './config/build.config.js';
import { authConfig } from './config/auth.config.js';
import { mailConfig } from './config/mail.config.js';
import { redisConfig } from './config/redis.config.js';
import { rabbitmqConfig } from './config/rabbitmq.config.js';
import { geminiConfig } from './config/gemini.config.js';
import { ttsConfig } from './config/tts.config.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RabbitmqModule } from './rabbitmq/rabbitmq.module.js';
import { RedisModule } from './redis/redis.module.js';
import { RedisService } from './redis/redis.service.js';
import { RedisThrottlerStorage } from './common/throttler/redis-throttler.storage.js';
import { THROTTLE, throttleMessage } from './common/throttler/throttle-policies.js';
import { THROTTLE_MESSAGE } from './common/decorators/throttle-message.decorator.js';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter.js';
import { EmailModule } from './email/email.module.js';
import { ImportModule } from './import/import.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { PackagesModule } from './packages/packages.module.js';
import { WordsModule } from './words/words.module.js';
import { LearningModule } from './learning/learning.module.js';
import { GamesModule } from './games/games.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { AccountModule } from './account/account.module.js';
import { TtsModule } from './tts/tts.module.js';
import { FeedbackModule } from './feedback/feedback.module.js';
import { ReminderModule } from './reminder/reminder.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ENV_FILE,
      expandVariables: true,
      validate: validateApiEnv,
      load: [
        appConfig,
        buildConfig,
        authConfig,
        mailConfig,
        redisConfig,
        rabbitmqConfig,
        geminiConfig,
        ttsConfig,
      ],
    }),
    ThrottlerModule.forRootAsync({
      inject: [RedisService, Reflector],
      useFactory: (redis: RedisService, reflector: Reflector) => ({
        throttlers: [{ ttl: THROTTLE.DEFAULT.ttl, limit: THROTTLE.DEFAULT.limit }],
        storage: new RedisThrottlerStorage(redis),
        errorMessage: (context) =>
          reflector.get<string>(THROTTLE_MESSAGE, context.getHandler()) ??
          throttleMessage(THROTTLE.DEFAULT),
      }),
    }),
    PrismaModule,
    RabbitmqModule,
    RedisModule,
    EmailModule,
    ImportModule,
    HealthModule,
    AuthModule,
    PackagesModule,
    WordsModule,
    LearningModule,
    GamesModule,
    DashboardModule,
    AccountModule,
    TtsModule,
    FeedbackModule,
    ReminderModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
