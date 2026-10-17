import { Inject, Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import cron from 'node-cron';
import { schedulerConfig, type SchedulerConfig } from '../config/scheduler.config.js';
import { RedisService } from '../redis/redis.service.js';
import { REDIS_KEYS } from '../redis/cache-keys.constants.js';
import { dailyCron, maxGapMs } from '../daily-schedule.js';
import { errorMessage } from '../common/utils/error-message.js';

export interface ScheduledTask {
  name: string;
  cron: string;
  endpoint: string;
  maxGapMs: number;
  description: string;
}

const REMINDER_HOURS = [6, 12, 18, 23];

export const TASKS: ScheduledTask[] = [
  {
    name: 'reminder',
    cron: dailyCron(REMINDER_HOURS),
    endpoint: '/api/reminder',
    maxGapMs: maxGapMs(REMINDER_HOURS),
    description: 'Vocabulary reminder emails + expired account cleanup',
  },
];

const CRON_TIMEZONE = 'Europe/Paris';
const REQUEST_TIMEOUT_MS = 120_000;

/** Triggers the API's task endpoints on cron; runs no business logic itself (Celery Beat pattern) */
@Injectable()
export class SchedulerService implements OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly jobs: ReturnType<typeof cron.schedule>[] = [];

  constructor(
    @Inject(schedulerConfig.KEY) private readonly config: SchedulerConfig,
    private readonly redis: RedisService,
  ) {}

  /** Run now every task whose last recorded run is older than its maximum gap */
  async catchUp(tasks = TASKS): Promise<void> {
    this.logger.log('Checking for missed tasks...');
    for (const task of tasks) {
      const lastRun = await this.getLastRun(task.name);
      if (lastRun === null) {
        this.logger.log(`"${task.name}": no previous run recorded — skipping catch-up.`);
        continue;
      }
      const elapsed = Date.now() - lastRun;
      if (elapsed > task.maxGapMs) {
        const hoursAgo = (elapsed / 3_600_000).toFixed(1);
        this.logger.log(
          `"${task.name}": last run ${hoursAgo}h ago (max gap: ${task.maxGapMs / 3_600_000}h) — catching up now.`,
        );
        await this.trigger(task);
      }
    }
  }

  start(tasks = TASKS): void {
    for (const task of tasks) {
      this.jobs.push(
        cron.schedule(task.cron, () => this.trigger(task), { timezone: CRON_TIMEZONE }),
      );
      this.logger.log(
        `Registered "${task.name}" — cron: ${task.cron} (${CRON_TIMEZONE}) — ${task.description}`,
      );
    }
    this.logger.log(`Ready — ${tasks.length} task(s) scheduled. Target: ${this.config.apiUrl}`);
  }

  onModuleDestroy() {
    this.jobs.forEach((job) => job.stop());
  }

  async trigger(task: ScheduledTask): Promise<void> {
    const url = `${this.config.apiUrl}${task.endpoint}`;
    const start = Date.now();
    this.logger.log(`Triggering "${task.name}" → POST ${url}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Cron-Secret': this.config.cronSecret },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      const body: Record<string, unknown> = await response.json().catch(() => ({}));
      const durationMs = Date.now() - start;

      if (response.ok) {
        this.logger.log(
          `"${task.name}" completed in ${durationMs}ms: ${(body.message as string) || 'OK'}`,
        );
        await this.setLastRun(task.name);
      } else {
        this.logger.error(
          `"${task.name}" failed (HTTP ${response.status}) in ${durationMs}ms: ${(body.message as string) || response.statusText}`,
        );
      }
    } catch (err) {
      this.logger.error(`"${task.name}" error: ${errorMessage(err)}`);
    }
  }

  private async getLastRun(taskName: string): Promise<number | null> {
    if (!this.redis.isReady()) return null;
    try {
      const val = await this.redis.getClient()!.get(REDIS_KEYS.schedulerLastRun(taskName));
      return val ? parseInt(val, 10) : null;
    } catch {
      return null;
    }
  }

  private async setLastRun(taskName: string): Promise<void> {
    if (!this.redis.isReady()) return;
    try {
      await this.redis.getClient()!.set(REDIS_KEYS.schedulerLastRun(taskName), String(Date.now()));
    } catch (err) {
      this.logger.warn(`Failed to persist last_run for "${taskName}": ${errorMessage(err)}`);
    }
  }
}
