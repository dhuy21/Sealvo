import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { RabbitmqModule } from './rabbitmq/rabbitmq.module.js';
import { RedisModule } from './redis/redis.module.js';
import { EmailModule } from './email/email.module.js';
import { ImportModule } from './import/import.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { PackagesModule } from './packages/packages.module.js';
import { WordsModule } from './words/words.module.js';
import { LearningModule } from './learning/learning.module.js';
import { GamesModule } from './games/games.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { TtsModule } from './tts/tts.module.js';
import { FeedbackModule } from './feedback/feedback.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
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
    TtsModule,
    FeedbackModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
