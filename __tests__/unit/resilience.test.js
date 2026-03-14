const {
  withTimeout,
  withRetry,
  CircuitBreaker,
  TimeoutError,
  CircuitOpenError,
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
