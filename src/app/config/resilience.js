/**
 * Centralized resilience policy configuration.
 *
 * All values are tuneable via environment variables without redeployment.
 * Defaults match the values validated in Phase 4.
 *
 * Naming convention: SERVICE_PARAM_UNIT (e.g. TTS_SYNTHESIZE_TIMEOUT_MS)
 */
const env = (key, fallback) => {
  const v = process.env[key];
  if (v == null || v === '') return fallback;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
};

module.exports = {
  tts: {
    synthesizeTimeout: env('TTS_SYNTHESIZE_TIMEOUT_MS', 5000),
    voicesTimeout: env('TTS_VOICES_TIMEOUT_MS', 8000),
    retries: env('TTS_RETRIES', 2),
    retryDelay: env('TTS_RETRY_DELAY_MS', 500),
    breakerThreshold: env('TTS_BREAKER_THRESHOLD', 5),
    breakerResetTimeout: env('TTS_BREAKER_RESET_MS', 30000),
  },
  gemini: {
    modifyTimeout: env('GEMINI_MODIFY_TIMEOUT_MS', 15000),
    generateTimeout: env('GEMINI_GENERATE_TIMEOUT_MS', 30000),
    retries: env('GEMINI_RETRIES', 1),
    retryDelay: env('GEMINI_RETRY_DELAY_MS', 2000),
    breakerThreshold: env('GEMINI_BREAKER_THRESHOLD', 5),
    breakerResetTimeout: env('GEMINI_BREAKER_RESET_MS', 60000),
  },
  email: {
    timeout: env('EMAIL_TIMEOUT_MS', 10000),
    retries: env('EMAIL_RETRIES', 2),
    retryDelay: env('EMAIL_RETRY_DELAY_MS', 1000),
  },
};
