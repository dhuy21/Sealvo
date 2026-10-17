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

/**
 * Cache TTL values in seconds
 */
export const CACHE_TTL = {
  DASHBOARD: 300, // 5 min
  TTS_VOICES: 21_600, // 6h
  TTS_AUDIO: 86_400, // 24h
  EMAIL_DEDUP: 86_400, // 24h
  REMINDER_RUN: 7_200, // 2h, outlives the hour it covers
} as const;
