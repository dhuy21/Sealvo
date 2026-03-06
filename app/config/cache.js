/**
 * Centralized cache TTL configuration.
 *
 * These are "safety net" values — the primary freshness mechanism is explicit
 * invalidation on writes (cache.del). Short TTLs ensure stale data never
 * lingers too long if an invalidation is missed.
 *
 * Guidelines for choosing TTL:
 *   - Data changed by the CURRENT user (dashboard, user packages, game stats)
 *     → short-to-medium TTL (3-5 min) because writes trigger invalidation anyway.
 *   - Data changed by OTHER users (public packages, leaderboards)
 *     → medium-to-long TTL (2-10 min) depending on acceptable staleness.
 *   - External API data that rarely changes (TTS voice list)
 *     → long TTL (hours) because the source updates very infrequently.
 *   - Generated content that never changes (TTS audio for a given text+voice)
 *     → very long TTL (24h) because the output is deterministic.
 */
module.exports = {
  DASHBOARD: 300, // 5 min — invalidated on word/package/game writes
  PACKAGES_USER: 300, // 5 min — invalidated on package CRUD
  PACKAGES_SHARED: 600, // 10 min — public/protected packages, less frequent changes
  LEADERBOARD: 120, // 2 min — global data from all users, accept some staleness
  GAME_STATS: 300, // 5 min — per-user, invalidated on score save
  TTS_VOICES: 21600, // 6h — Google adds new voices ~quarterly; no invalidation needed
  TTS_AUDIO: 86400, // 24h — deterministic: same text + language = same audio
};
