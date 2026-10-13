/**
 * Worker process — RabbitMQ consumers (email + import).
 *
 * Same Docker image as API, different CMD:
 *   CMD ["node", "dist/worker.js"]
 *
 * Does NOT start HTTP server — only consumes queues.
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { RabbitmqService } from './rabbitmq/rabbitmq.service.js';
import { EmailQueueService } from './email/email-queue.service.js';
import { ImportQueueService } from './import/import-queue.service.js';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const rabbitmq = app.get(RabbitmqService);
  if (!rabbitmq.isReady()) {
    console.error('[worker] RabbitMQ not connected — exiting.');
    await app.close();
    process.exit(1);
  }

  const emailQueue = app.get(EmailQueueService);
  const importQueue = app.get(ImportQueueService);

  // Setup queue topologies
  await emailQueue.setupTopology();
  await importQueue.setupTopology();

  // Start consumers
  await emailQueue.startConsumer();
  await importQueue.startConsumer();

  console.log('[worker] Ready — consuming email + import queues.');

  const shutdown = async (signal: string) => {
    console.log(`[worker] ${signal} received, shutting down...`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

await bootstrap();
