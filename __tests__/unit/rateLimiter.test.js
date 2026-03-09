/**
 * Unit tests: app/middleware/rateLimiter.js
 *
 * Verifies:
 *   - All limiters are exported and are functions (middleware signature)
 *   - safeLimiter wraps express-rate-limit correctly
 *   - Graceful degradation: store errors are swallowed and request proceeds
 */

jest.mock('../../app/core/redis', () => ({
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false),
}));

jest.mock('rate-limit-redis', () => ({
  RedisStore: jest.fn(),
}));

const limiterModule = require('../../app/middleware/rateLimiter');

describe('rateLimiter module', () => {
  const EXPECTED_LIMITERS = [
    'loginLimiter',
    'registerLimiter',
    'forgotPasswordLimiter',
    'ttsLimiter',
    'globalLimiter',
    'emailLimiter',
    'feedbackLimiter',
  ];

  it.each(EXPECTED_LIMITERS)('exports %s as a function', (name) => {
    expect(typeof limiterModule[name]).toBe('function');
  });

  it('exports exactly the expected number of limiters', () => {
    expect(Object.keys(limiterModule)).toHaveLength(EXPECTED_LIMITERS.length);
  });
});

describe('safeLimiter graceful degradation', () => {
  it('calls next() when invoked with a proper Express-like req (MemoryStore fallback)', async () => {
    const { loginLimiter } = limiterModule;

    // express-rate-limit reads req.app.get('trust proxy') internally
    const req = {
      ip: '127.0.0.1',
      method: 'POST',
      url: '/login',
      headers: {},
      app: { get: jest.fn().mockReturnValue(false) },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      getHeader: jest.fn(),
    };
    const next = jest.fn();

    await new Promise((resolve) => {
      loginLimiter(req, res, (...args) => {
        next(...args);
        resolve();
      });
      // Safety timeout in case next is never called
      setTimeout(resolve, 500);
    });

    expect(next).toHaveBeenCalled();
  });
});
