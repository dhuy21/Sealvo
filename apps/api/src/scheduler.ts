/**
 * Scheduler process — Cron-based task triggering (Celery Beat pattern).
 *
 * Same Docker image as API, different CMD:
 *   CMD ["node", "dist/scheduler.js"]
 *
 * Does NOT execute business logic — only triggers via HTTP POST to API.
 * Uses Redis for last-run tracking and catch-up on startup.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SchedulerModule } from './scheduler.module.js';
import { SchedulerService } from './scheduler/scheduler.service.js';
import { RedisService } from './redis/redis.service.js';
import { buildConfig, type BuildConfig } from './config/build.config.js';
import { startHeartbeat } from './health/heartbeat.js';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SchedulerModule);
  const logger = new Logger('Scheduler');

  // Before the catch-up, which can take minutes: lets the deploy check this commit is running
  const stopHeartbeat = startHeartbeat(
    app.get(RedisService),
    'scheduler',
    app.get<BuildConfig>(buildConfig.KEY).gitSha,
  );

  const scheduler = app.get(SchedulerService);
  await scheduler.catchUp();
  scheduler.start();

  const shutdown = async (signal: string) => {
    logger.log(`${signal} received, shutting down...`);
    const forceExitTimer = setTimeout(() => {
      logger.error('Shutdown timeout — forcing exit.');
      process.exit(1);
    }, 5000);
    forceExitTimer.unref();
    stopHeartbeat();
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

await bootstrap();
