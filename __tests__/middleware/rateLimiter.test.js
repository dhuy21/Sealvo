/**
 * Unit tests: rateLimiter pipeline
 *
 * Phase 3 — validates that:
 * - All 7 limiters are exported as middleware functions
 * - Requests under the limit pass through (next called without error)
 * - Requests exceeding the limit produce TooManyRequestsError (→ errorHandler pipeline)
 */
const { TooManyRequestsError } = require('../../app/errors/AppError');

jest.mock('../../app/core/redis', () => ({
  isReady: () => false,
  getClient: () => null,
}));

const {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  ttsLimiter,
  globalLimiter,
  emailLimiter,
  feedbackLimiter,
} = require('../../app/middleware/rateLimiter');

function mockReq(ip = '127.0.0.1') {
  return { ip, method: 'POST', path: '/test', headers: {} };
}

function mockRes() {
  const res = {};
  res.setHeader = jest.fn();
  res.getHeader = jest.fn(() => undefined);
  res.set = jest.fn(() => res);
  res.status = jest.fn(() => res);
  res.send = jest.fn();
  res.json = jest.fn();
  return res;
}

function callLimiter(limiter, ip) {
  return new Promise((resolve) => {
    limiter(mockReq(ip), mockRes(), (err) => resolve(err));
  });
}

describe('rateLimiter (unit)', () => {
  it('exports all 7 limiters as middleware functions', () => {
    expect(typeof loginLimiter).toBe('function');
    expect(typeof registerLimiter).toBe('function');
    expect(typeof forgotPasswordLimiter).toBe('function');
    expect(typeof ttsLimiter).toBe('function');
    expect(typeof globalLimiter).toBe('function');
    expect(typeof emailLimiter).toBe('function');
    expect(typeof feedbackLimiter).toBe('function');
  });

  it('allows requests under the limit', async () => {
    const err = await callLimiter(emailLimiter, '10.0.0.1');
    expect(err).toBeUndefined();
  });

  it('produces TooManyRequestsError when limit is exceeded', async () => {
    const ip = '10.0.0.42';
    const max = 3;

    for (let i = 0; i < max; i++) {
      await callLimiter(emailLimiter, ip);
    }

    const err = await callLimiter(emailLimiter, ip);
    expect(err).toBeInstanceOf(TooManyRequestsError);
    expect(err.statusCode).toBe(429);
    expect(err.message).toMatch(/email/i);
  });
});
