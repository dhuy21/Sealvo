const {
  withTimeout,
  withRetry,
  CircuitBreaker,
  TimeoutError,
  CircuitOpenError,
  isTransientError,
} = require('../../app/core/resilience');

// ---------------------------------------------------------------------------
// withTimeout
// ---------------------------------------------------------------------------
describe('withTimeout', () => {
  it('resolves if fn completes before deadline', async () => {
    const result = await withTimeout(() => Promise.resolve('ok'), 500);
    expect(result).toBe('ok');
  });

  it('rejects with TimeoutError if fn exceeds deadline', async () => {
    jest.useFakeTimers();
    const slow = () => new Promise((r) => setTimeout(() => r('late'), 2000));
    const promise = withTimeout(slow, 50);
    jest.advanceTimersByTime(60);
    await expect(promise).rejects.toThrow(TimeoutError);
    jest.useRealTimers();
  });

  it('propagates fn error (not TimeoutError) if fn rejects before deadline', async () => {
    const failing = () => Promise.reject(new Error('boom'));
    await expect(withTimeout(failing, 500)).rejects.toThrow('boom');
  });
});

// ---------------------------------------------------------------------------
// withRetry
// ---------------------------------------------------------------------------
describe('withRetry', () => {
  it('returns on first success without retrying', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { retries: 3, delay: 10 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries up to N times then throws last error', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('e1'))
      .mockRejectedValueOnce(new Error('e2'))
      .mockRejectedValueOnce(new Error('e3'));

    await expect(withRetry(fn, { retries: 2, delay: 10 })).rejects.toThrow('e3');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('succeeds on a later attempt', async () => {
    const fn = jest.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValue('ok');

    const result = await withRetry(fn, { retries: 2, delay: 10 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// CircuitBreaker
// ---------------------------------------------------------------------------
describe('CircuitBreaker', () => {
  let breaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({ name: 'test', threshold: 3, resetTimeout: 200 });
  });

  it('starts in CLOSED state', () => {
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('stays CLOSED when calls succeed', async () => {
    await breaker.execute(() => Promise.resolve('ok'));
    await breaker.execute(() => Promise.resolve('ok'));
    expect(breaker.getState()).toBe('CLOSED');
    expect(breaker.failureCount).toBe(0);
  });

  it('opens after threshold consecutive failures', async () => {
    const failing = () => Promise.reject(new Error('fail'));

    for (let i = 0; i < 3; i++) {
      await breaker.execute(failing).catch(() => {});
    }

    expect(breaker.getState()).toBe('OPEN');
  });

  it('rejects immediately with CircuitOpenError when OPEN', async () => {
    const failing = () => Promise.reject(new Error('fail'));
    for (let i = 0; i < 3; i++) {
      await breaker.execute(failing).catch(() => {});
    }

    await expect(breaker.execute(() => Promise.resolve('ok'))).rejects.toThrow(CircuitOpenError);
  });

  it('transitions to HALF_OPEN after resetTimeout, then CLOSED on success', async () => {
    const failing = () => Promise.reject(new Error('fail'));
    for (let i = 0; i < 3; i++) {
      await breaker.execute(failing).catch(() => {});
    }

    expect(breaker.getState()).toBe('OPEN');

    await new Promise((r) => setTimeout(r, 250));

    expect(breaker.getState()).toBe('HALF_OPEN');

    const result = await breaker.execute(() => Promise.resolve('recovered'));
    expect(result).toBe('recovered');
    expect(breaker.getState()).toBe('CLOSED');
    expect(breaker.failureCount).toBe(0);
  });

  it('returns to OPEN if HALF_OPEN probe fails', async () => {
    const failing = () => Promise.reject(new Error('fail'));
    for (let i = 0; i < 3; i++) {
      await breaker.execute(failing).catch(() => {});
    }

    await new Promise((r) => setTimeout(r, 250));

    await breaker.execute(failing).catch(() => {});
    expect(breaker.getState()).toBe('OPEN');
  });

  it('resets failure count on success (mixed calls)', async () => {
    await breaker.execute(() => Promise.reject(new Error('f'))).catch(() => {});
    await breaker.execute(() => Promise.reject(new Error('f'))).catch(() => {});
    expect(breaker.failureCount).toBe(2);

    await breaker.execute(() => Promise.resolve('ok'));
    expect(breaker.failureCount).toBe(0);
    expect(breaker.getState()).toBe('CLOSED');
  });
});

// ---------------------------------------------------------------------------
// isTransientError
// ---------------------------------------------------------------------------
describe('isTransientError', () => {
  it('returns true for TimeoutError', () => {
    expect(isTransientError(new TimeoutError(5000))).toBe(true);
  });

  it('returns true for transient gRPC codes (4, 8, 13, 14)', () => {
    for (const code of [4, 8, 13, 14]) {
      const err = new Error('gRPC fail');
      err.code = code;
      expect(isTransientError(err)).toBe(true);
    }
  });

  it('returns false for non-transient gRPC codes (3=INVALID, 7=PERMISSION, 16=UNAUTHENTICATED)', () => {
    for (const code of [3, 7, 16]) {
      const err = new Error('gRPC fail');
      err.code = code;
      expect(isTransientError(err)).toBe(false);
    }
  });

  it('returns true for HTTP 429 and 5xx', () => {
    for (const status of [429, 500, 502, 503, 504]) {
      const err = new Error('HTTP fail');
      err.status = status;
      expect(isTransientError(err)).toBe(true);
    }
  });

  it('returns false for HTTP 400/401/403/404', () => {
    for (const status of [400, 401, 403, 404]) {
      const err = new Error('HTTP fail');
      err.status = status;
      expect(isTransientError(err)).toBe(false);
    }
  });

  it('returns true for Node.js network errors', () => {
    for (const code of [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'EPIPE',
      'EAI_AGAIN',
      'ENOTFOUND',
    ]) {
      const err = new Error('net fail');
      err.code = code;
      expect(isTransientError(err)).toBe(true);
    }
  });

  it('returns false for plain Error without structured properties', () => {
    expect(isTransientError(new Error('unknown'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// withRetry — shouldRetry predicate
// ---------------------------------------------------------------------------
describe('withRetry — shouldRetry', () => {
  it('skips retry when shouldRetry returns false', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('non-transient'));
    const shouldRetry = jest.fn().mockReturnValue(false);

    await expect(withRetry(fn, { retries: 3, delay: 10, shouldRetry })).rejects.toThrow(
      'non-transient'
    );
    expect(fn).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledTimes(1);
  });

  it('retries when shouldRetry returns true', async () => {
    const fn = jest.fn().mockRejectedValueOnce(new Error('transient')).mockResolvedValue('ok');
    const shouldRetry = jest.fn().mockReturnValue(true);

    const result = await withRetry(fn, { retries: 2, delay: 10, shouldRetry });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries everything when shouldRetry is not provided (backward compat)', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('e1'))
      .mockRejectedValueOnce(new Error('e2'))
      .mockResolvedValue('ok');

    const result = await withRetry(fn, { retries: 2, delay: 10 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// CircuitBreaker — registry
// ---------------------------------------------------------------------------
describe('CircuitBreaker — registry', () => {
  it('automatically registers instances by name', () => {
    const b = new CircuitBreaker({ name: 'reg-test-1', threshold: 3, resetTimeout: 100 });
    expect(CircuitBreaker.getAll().get('reg-test-1')).toBe(b);
  });

  it('getAll returns a Map of all created breakers', () => {
    new CircuitBreaker({ name: 'reg-test-2', threshold: 3, resetTimeout: 100 });
    const all = CircuitBreaker.getAll();
    expect(all).toBeInstanceOf(Map);
    expect(all.has('reg-test-2')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Composition: CircuitBreaker + withRetry + withTimeout
// ---------------------------------------------------------------------------
describe('Resilience composition', () => {
  it('retry recovers from transient timeout, circuit stays CLOSED', async () => {
    let callCount = 0;
    const fn = () => {
      callCount++;
      if (callCount === 1)
        return new Promise((_, rej) => setTimeout(() => rej(new TimeoutError(50)), 60));
      return Promise.resolve('ok');
    };

    const breaker = new CircuitBreaker({ name: 'comp', threshold: 3, resetTimeout: 500 });
    const result = await breaker.execute(() => withRetry(fn, { retries: 2, delay: 10 }));

    expect(result).toBe('ok');
    expect(callCount).toBe(2);
    expect(breaker.getState()).toBe('CLOSED');
  });
});
