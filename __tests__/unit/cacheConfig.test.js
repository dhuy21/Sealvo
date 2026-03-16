/**
 * Unit tests: app/config/cache.js
 *
 * Ensures the centralized TTL config exports the expected shape and all values
 * are positive integers within a reasonable range.
 */
const CACHE_TTL = require('../../app/config/cache');

describe('Cache TTL config', () => {
  const EXPECTED_KEYS = [
    'DASHBOARD',
    'PACKAGES_USER',
    'PACKAGES_SHARED',
    'WORDS',
    'HIGH_SCORE',
    'TTS_VOICES',
    'TTS_AUDIO',
    'SESSION',
  ];

  it('exports all required TTL keys', () => {
    for (const key of EXPECTED_KEYS) {
      expect(CACHE_TTL).toHaveProperty(key);
    }
  });

  it.each(EXPECTED_KEYS)('%s is a positive integer (seconds)', (key) => {
    const val = CACHE_TTL[key];
    expect(typeof val).toBe('number');
    expect(Number.isInteger(val)).toBe(true);
    expect(val).toBeGreaterThan(0);
    expect(val).toBeLessThanOrEqual(86400); // max 24h
  });

  it('PACKAGES_SHARED >= PACKAGES_USER (shared data changes less frequently)', () => {
    expect(CACHE_TTL.PACKAGES_SHARED).toBeGreaterThanOrEqual(CACHE_TTL.PACKAGES_USER);
  });

  it('TTS_AUDIO >= TTS_VOICES (audio is deterministic, voices change rarely)', () => {
    expect(CACHE_TTL.TTS_AUDIO).toBeGreaterThanOrEqual(CACHE_TTL.TTS_VOICES);
  });

  it('TTS TTLs are significantly longer than application data TTLs', () => {
    expect(CACHE_TTL.TTS_VOICES).toBeGreaterThan(CACHE_TTL.PACKAGES_SHARED);
    expect(CACHE_TTL.TTS_AUDIO).toBeGreaterThan(CACHE_TTL.TTS_VOICES);
  });
});
