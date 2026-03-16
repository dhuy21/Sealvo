/**
 * scheduler.js — Centralized task scheduler (Celery Beat pattern).
 *
 * A lightweight long-running process that triggers scheduled tasks
 * by sending HTTP requests to the Web API. It does NOT execute
 * business logic itself — it only decides WHEN to trigger.
 *
 * Architecture:
 *   Scheduler (this) → HTTP POST → Web Server → RabbitMQ → Worker
 *
 * Features:
 *   - Cron-based scheduling via node-cron
 *   - Catch-up on startup: detects missed executions during downtime
 *   - Redis-based last-run tracking for resilience
 *   - Graceful shutdown
 *
 * Usage: node scheduler.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const cron = require('node-cron');
const redis = require('./app/core/redis');

// ── Configuration ────────────────────────────────────────────────

const API_URL = process.env.SCHEDULER_API_URL;
const CRON_SECRET = process.env.CRON_SECRET;
const REDIS_PREFIX = 'scheduler:';
const REQUEST_TIMEOUT_MS = 120_000;

if (!API_URL) {
  console.error('[scheduler] SCHEDULER_API_URL is not set — exiting.');
  process.exit(1);
}

if (!CRON_SECRET) {
  console.error('[scheduler] CRON_SECRET is not set — exiting.');
  process.exit(1);
}

// ── Task Registry ────────────────────────────────────────────────
// Add new scheduled tasks here. Each entry needs:
//   name       — unique identifier (used as Redis key)
//   cron       — crontab expression (UTC)
//   endpoint   — Web API path to POST
//   maxGapMs   — max acceptable time since last run before catch-up triggers
//   description— human-readable purpose

const TASKS = [
  {
    name: 'reminder',
    cron: '0 6,12,18,23 * * *',
    endpoint: '/api/reminder',
    maxGapMs: 7 * 3600 * 1000,
    description: 'Vocabulary reminder emails + expired account cleanup',
  },
];

// ── HTTP Trigger ─────────────────────────────────────────────────

async function triggerTask(task) {
  const url = `${API_URL}${task.endpoint}`;
  const start = Date.now();
  console.log(`[scheduler] Triggering "${task.name}" → POST ${url}`);

  let success = false;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cron-Secret': CRON_SECRET,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const body = await response.json().catch(() => ({}));
    const durationMs = Date.now() - start;

    if (response.ok) {
      success = true;
      console.log(`[scheduler] "${task.name}" completed in ${durationMs}ms:`, body.message || 'OK');
    } else {
      console.error(
        `[scheduler] "${task.name}" failed (HTTP ${response.status}) in ${durationMs}ms:`,
        body.message || response.statusText
      );
    }
  } catch (err) {
    console.error(`[scheduler] "${task.name}" error:`, err.message);
  }

  if (success) await setLastRun(task.name);
}

// ── Redis Tracking ───────────────────────────────────────────────

async function getLastRun(taskName) {
  if (!redis.isReady()) return null;
  try {
    const val = await redis.getClient().get(REDIS_PREFIX + taskName + ':last_run');
    return val ? parseInt(val, 10) : null;
  } catch {
    return null;
  }
}

async function setLastRun(taskName) {
  if (!redis.isReady()) return;
  try {
    await redis.getClient().set(REDIS_PREFIX + taskName + ':last_run', String(Date.now()));
  } catch (err) {
    console.warn(`[scheduler] Failed to persist last_run for "${taskName}":`, err.message);
  }
}

// ── Catch-up Logic ───────────────────────────────────────────────

async function catchUpMissedTasks() {
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
        `[scheduler] "${task.name}": last run ${hoursAgo}h ago (max gap: ${task.maxGapMs / 3_600_000}h) — catching up now.`
      );
      await triggerTask(task);
    } else {
      const hoursAgo = (elapsed / 3_600_000).toFixed(1);
      console.log(`[scheduler] "${task.name}": last run ${hoursAgo}h ago — no catch-up needed.`);
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────

(async () => {
  try {
    await redis.connect();

    await catchUpMissedTasks();

    const jobs = [];
    for (const task of TASKS) {
      const job = cron.schedule(task.cron, () => triggerTask(task), { timezone: 'UTC' });
      jobs.push(job);
      console.log(
        `[scheduler] Registered "${task.name}" — cron: ${task.cron} (UTC) — ${task.description}`
      );
    }

    console.log(`[scheduler] Ready — ${TASKS.length} task(s) scheduled. Target: ${API_URL}`);

    const shutdown = async (signal) => {
      console.log(`[scheduler] ${signal} received, shutting down...`);
      const forceExitTimer = setTimeout(() => {
        console.error('[scheduler] Shutdown timeout — forcing exit.');
        process.exit(1);
      }, 5000);
      forceExitTimer.unref();
      jobs.forEach((j) => j.stop());
      await redis.disconnect();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('[scheduler] Fatal error:', err);
    process.exit(1);
  }
})();
