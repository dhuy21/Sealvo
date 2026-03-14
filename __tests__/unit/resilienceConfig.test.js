/**
 * Tests: config/resilience.js — env var overrides and defaults.
 */

describe('config/resilience — defaults', () => {
  let config;

  beforeAll(() => {
    jest.isolateModules(() => {
      config = require('../../app/config/resilience');
    });
  });

  it('tts defaults match Phase 4 validated values', () => {
    expect(config.tts.synthesizeTimeout).toBe(5000);
    expect(config.tts.voicesTimeout).toBe(8000);
    expect(config.tts.retries).toBe(2);
    expect(config.tts.retryDelay).toBe(500);
    expect(config.tts.breakerThreshold).toBe(5);
    expect(config.tts.breakerResetTimeout).toBe(30000);
  });

  it('gemini defaults match Phase 4 validated values', () => {
    expect(config.gemini.modifyTimeout).toBe(15000);
    expect(config.gemini.generateTimeout).toBe(30000);
    expect(config.gemini.retries).toBe(1);
    expect(config.gemini.retryDelay).toBe(2000);
    expect(config.gemini.breakerThreshold).toBe(5);
    expect(config.gemini.breakerResetTimeout).toBe(60000);
  });

  it('email defaults match Phase 4 validated values', () => {
    expect(config.email.timeout).toBe(10000);
    expect(config.email.retries).toBe(2);
    expect(config.email.retryDelay).toBe(1000);
  });
});

describe('config/resilience — env var overrides', () => {
  const OVERRIDES = {
    TTS_SYNTHESIZE_TIMEOUT_MS: '3000',
    TTS_RETRIES: '5',
    GEMINI_GENERATE_TIMEOUT_MS: '45000',
    EMAIL_TIMEOUT_MS: '20000',
  };

  let config;

  beforeAll(() => {
    Object.assign(process.env, OVERRIDES);
    jest.isolateModules(() => {
      config = require('../../app/config/resilience');
    });
  });

  afterAll(() => {
    for (const key of Object.keys(OVERRIDES)) {
      delete process.env[key];
    }
  });

  it('reads TTS_SYNTHESIZE_TIMEOUT_MS from env', () => {
    expect(config.tts.synthesizeTimeout).toBe(3000);
  });

  it('reads TTS_RETRIES from env', () => {
    expect(config.tts.retries).toBe(5);
  });

  it('reads GEMINI_GENERATE_TIMEOUT_MS from env', () => {
    expect(config.gemini.generateTimeout).toBe(45000);
  });

  it('reads EMAIL_TIMEOUT_MS from env', () => {
    expect(config.email.timeout).toBe(20000);
  });

  it('non-overridden values still use defaults', () => {
    expect(config.tts.voicesTimeout).toBe(8000);
    expect(config.gemini.retries).toBe(1);
    expect(config.email.retries).toBe(2);
  });
});
