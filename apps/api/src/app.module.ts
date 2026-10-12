import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { PackagesModule } from './packages/packages.module.js';
import { WordsModule } from './words/words.module.js';
import { LearningModule } from './learning/learning.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    PackagesModule,
    WordsModule,
    LearningModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
