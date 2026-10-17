/**
 * Worker process — RabbitMQ consumers (email + import).
 *
 * Same Docker image as API, different CMD:
 *   CMD ["node", "dist/worker.js"]
 *
 * Does NOT start HTTP server — only consumes queues.
 */

import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module.js';
import { RabbitmqService } from './rabbitmq/rabbitmq.service.js';
import { EmailQueueService } from './email/email-queue.service.js';
import { ImportQueueService } from './import/import-queue.service.js';
import { RedisService } from './redis/redis.service.js';
import { buildConfig, type BuildConfig } from './config/build.config.js';
import { startHeartbeat } from './health/heartbeat.js';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);

  const rabbitmq = app.get(RabbitmqService);
  if (!rabbitmq.isReady()) {
    console.error('[worker] RabbitMQ not connected — exiting.');
    await app.close();
    process.exit(1);
  }

  const emailQueue = app.get(EmailQueueService);
  const importQueue = app.get(ImportQueueService);

  // Topologies are asserted by the queue services whenever the channel opens
  await emailQueue.startConsumer();
  await importQueue.startConsumer();

  // Exit so the platform restarts the worker: a fresh process re-subscribes the consumers
  rabbitmq.onConnectionLost(() => {
    console.error('[worker] RabbitMQ connection lost — exiting to restart the consumers.');
    process.exit(1);
  });

  // Lets the deploy check that this commit's worker is running (no HTTP server to probe)
  const stopHeartbeat = startHeartbeat(
    app.get(RedisService),
    'worker',
    app.get<BuildConfig>(buildConfig.KEY).gitSha,
  );

  console.log('[worker] Ready — consuming email + import queues.');

  const shutdown = async (signal: string) => {
    console.log(`[worker] ${signal} received, shutting down...`);
    stopHeartbeat();
    // Before app.close(): the jobs in progress still need Prisma and Redis
    await rabbitmq.stopConsumers();
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

await bootstrap();
