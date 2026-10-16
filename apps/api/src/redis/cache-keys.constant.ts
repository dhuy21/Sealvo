/**
 * Centralized cache key patterns (fix #61: no magic strings scattered across codebase)
 */
export const CACHE_KEYS = {
  dashboard: (userId: string) => `dashboard:${userId}`,
  packagesUser: (userId: string) => `pkgs:user:${userId}`,
  packagesShared: 'pkgs:shared',
  words: (packageId: number) => `words:${packageId}`,
  highScore: (userId: string, gameType: string) => `highscore:${userId}:${gameType}`,
  // Redis hash: must not reuse `lvlprog:` where older code stored a JSON string (WRONGTYPE)
  levelProgress: (userId: string) => `lvlprog:h:${userId}`,
  emailDedup: (messageId: string) => `email:dedup:${messageId}`,
  ttsAudio: (language: string, hash: string) => `tts:audio:${language}:${hash}`,
  ttsVoices: (language: string) => `tts:voices:${language}`,
} as const;

/**
 * Cache TTL values in seconds (from old cache config)
 */
export const CACHE_TTL = {
  DASHBOARD: 300, // 5 min
  PACKAGES_USER: 300, // 5 min
  PACKAGES_SHARED: 600, // 10 min
  WORDS: 300, // 5 min
  HIGH_SCORE: 300, // 5 min
  TTS_VOICES: 21_600, // 6h
  TTS_AUDIO: 86_400, // 24h
  SESSION: 10_800, // 3h
  EMAIL_DEDUP: 86_400, // 24h
} as const;
