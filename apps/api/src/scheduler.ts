/**
 * Scheduler process — Cron-based task triggering (Celery Beat pattern).
 *
 * Same Docker image as API, different CMD:
 *   CMD ["node", "dist/scheduler.js"]
 *
 * Does NOT execute business logic — only triggers via HTTP POST to API.
 * Uses Redis for last-run tracking and catch-up on startup.
 */

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import cron from 'node-cron';
import { AppModule } from './app.module.js';
import { RedisService } from './redis/redis.service.js';

interface ScheduledTask {
  name: string;
  cron: string;
  endpoint: string;
  maxGapMs: number;
  description: string;
}

const TASKS: ScheduledTask[] = [
  {
    name: 'reminder',
    cron: '0 6,12,18,23 * * *',
    endpoint: '/api/reminder',
    maxGapMs: 7 * 3600 * 1000,
    description: 'Vocabulary reminder emails + expired account cleanup',
  },
];

const REDIS_PREFIX = 'scheduler:';
const REQUEST_TIMEOUT_MS = 120_000;

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const config = app.get(ConfigService);
  const redis = app.get(RedisService);

  const apiUrl = config.getOrThrow<string>('SCHEDULER_API_URL');
  const cronSecret = config.getOrThrow<string>('CRON_SECRET');

  // ── Helper functions ──

  async function getLastRun(taskName: string): Promise<number | null> {
    if (!redis.isReady()) return null;
    try {
      const val = await redis.getClient()!.get(REDIS_PREFIX + taskName + ':last_run');
      return val ? parseInt(val, 10) : null;
    } catch {
      return null;
    }
  }

  async function setLastRun(taskName: string): Promise<void> {
    if (!redis.isReady()) return;
    try {
      await redis.getClient()!.set(REDIS_PREFIX + taskName + ':last_run', String(Date.now()));
    } catch (err) {
      console.warn(
        `[scheduler] Failed to persist last_run for "${taskName}": ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  async function triggerTask(task: ScheduledTask): Promise<void> {
    const url = `${apiUrl}${task.endpoint}`;
    const start = Date.now();
    console.log(`[scheduler] Triggering "${task.name}" → POST ${url}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Cron-Secret': cronSecret,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      const body: Record<string, unknown> = await response.json().catch(() => ({}));
      const durationMs = Date.now() - start;

      if (response.ok) {
        console.log(
          `[scheduler] "${task.name}" completed in ${durationMs}ms: ${(body.message as string) || 'OK'}`,
        );
        await setLastRun(task.name);
      } else {
        console.error(
          `[scheduler] "${task.name}" failed (HTTP ${response.status}) in ${durationMs}ms: ${(body.message as string) || response.statusText}`,
        );
      }
    } catch (err) {
      console.error(
        `[scheduler] "${task.name}" error: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  // ── Catch-up missed tasks ──

  console.log('[scheduler] Checking for missed tasks...');
  for (const task of TASKS) {
    const lastRun = await getLastRun(task.name);
    if (lastRun === null) {
      console.log(`[scheduler] "${task.name}": no previous run recorded — skipping catch-up.`);
      continue;
    }
    const elapsed = Date.now() - lastRun;
    if (elapsed > task.maxGapMs) {
      const hoursAgo = (elapsed / 3_600_000).toFixed(1);
      console.log(
        `[scheduler] "${task.name}": last run ${hoursAgo}h ago (max gap: ${task.maxGapMs / 3_600_000}h) — catching up now.`,
      );
      await triggerTask(task);
    }
  }

  // ── Register cron jobs ──

  const jobs: ReturnType<typeof cron.schedule>[] = [];
  for (const task of TASKS) {
    const job = cron.schedule(task.cron, () => triggerTask(task), { timezone: 'UTC' });
    jobs.push(job);
    console.log(
      `[scheduler] Registered "${task.name}" — cron: ${task.cron} (UTC) — ${task.description}`,
    );
  }

  console.log(`[scheduler] Ready — ${TASKS.length} task(s) scheduled. Target: ${apiUrl}`);

  // ── Graceful shutdown ──

  const shutdown = async (signal: string) => {
    console.log(`[scheduler] ${signal} received, shutting down...`);
    const forceExitTimer = setTimeout(() => {
      console.error('[scheduler] Shutdown timeout — forcing exit.');
      process.exit(1);
    }, 5000);
    (forceExitTimer as NodeJS.Timeout).unref();
    jobs.forEach((j) => j.stop());
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

await bootstrap();
