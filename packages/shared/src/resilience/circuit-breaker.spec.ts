import { afterEach, describe, expect, it, vi } from 'vitest';
import { CircuitBreaker, CircuitOpenError } from './index.js';

const fail = () => Promise.reject(new Error('down'));

describe('CircuitBreaker', () => {
  afterEach(() => vi.useRealTimers());

  async function openBreaker() {
    vi.useFakeTimers();
    const breaker = new CircuitBreaker({ name: 'test', threshold: 2, resetTimeout: 1000 });
    for (let i = 0; i < 2; i++) await expect(breaker.execute(fail)).rejects.toThrow('down');
    expect(breaker.getState()).toBe('OPEN');
    return breaker;
  }

  it('rejects calls while open, without calling the service', async () => {
    const breaker = await openBreaker();
    const call = vi.fn(() => Promise.resolve('ok'));

    await expect(breaker.execute(call)).rejects.toBeInstanceOf(CircuitOpenError);
    expect(call).not.toHaveBeenCalled();
  });

  it('lets a single probe through once half-open, then closes on its success', async () => {
    const breaker = await openBreaker();
    vi.advanceTimersByTime(1000);
    let settle!: (value: string) => void;
    const probe = breaker.execute(() => new Promise<string>((resolve) => (settle = resolve)));

    await expect(breaker.execute(() => Promise.resolve('other'))).rejects.toBeInstanceOf(
      CircuitOpenError,
    );

    settle('ok');
    await expect(probe).resolves.toBe('ok');
    expect(breaker.getState()).toBe('CLOSED');
    await expect(breaker.execute(() => Promise.resolve('next'))).resolves.toBe('next');
  });

  it('opens again when the probe fails', async () => {
    const breaker = await openBreaker();
    vi.advanceTimersByTime(1000);

    await expect(breaker.execute(fail)).rejects.toThrow('down');
    expect(breaker.getState()).toBe('OPEN');
    await expect(breaker.execute(() => Promise.resolve('x'))).rejects.toBeInstanceOf(
      CircuitOpenError,
    );
  });
});
