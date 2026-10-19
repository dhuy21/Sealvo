/**
 * Centralized cache key patterns (fix #61: no magic strings scattered across codebase)
 */
export const CACHE_KEYS = {
  dashboard: (userId: string) => `dashboard:${userId}`,
  // Redis hash: must not reuse `lvlprog:` where older code stored a JSON string (WRONGTYPE)
  levelProgress: (userId: string) => `lvlprog:h:${userId}`,
  emailDedup: (messageId: string) => `email:dedup:${messageId}`,
  /** hour: `2026-10-17T12` (UTC) */
  reminderRun: (hour: string) => `reminder:run:${hour}`,
  ttsAudio: (language: string, hash: string) => `tts:audio:${language}:${hash}`,
  ttsVoices: (language: string) => `tts:voices:${language}`,
} as const;

/** Every key written to Redis; CacheService stores the CACHE_KEYS above under `cache()` */
export const REDIS_KEYS = {
  cache: (key: string) => `cache:${key}`,
  throttle: (key: string) => `throttle:${key}`,
  throttleBlocked: (key: string) => `throttle:${key}:blocked`,
  job: (jobId: string) => `job:${jobId}`,
  jobEvents: (jobId: string) => `job-events:${jobId}`,
  userJobs: (userId: string) => `user-jobs:${userId}`,
  heartbeat: (process: string) => `heartbeat:${process}`,
  /** One key per worker copy. A rolling deploy must not let an old copy hide behind a new one. */
  heartbeatReplica: (id: string) => `heartbeat:worker:${id}`,
  heartbeatReplicas: () => `heartbeat:worker:ids`,
  schedulerLastRun: (task: string) => `scheduler:${task}:last_run`,
} as const;

/**
 * Cache TTL values in seconds
 */
export const CACHE_TTL = {
  DASHBOARD: 300, // 5 min
  LEVEL_PROGRESS: 10_800, // 3h
  TTS_VOICES: 21_600, // 6h
  TTS_AUDIO: 86_400, // 24h
  EMAIL_DEDUP: 86_400, // 24h
  REMINDER_RUN: 7_200, // 2h, outlives the hour it covers
} as const;
