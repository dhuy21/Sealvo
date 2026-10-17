/**
 * Resilience primitives: Timeout, Retry (exponential backoff), Circuit Breaker.
 *
 * Composition order (outer → inner):
 *   CircuitBreaker → withRetry → withTimeout → actual call
 *
 * - Timeout fires → retry catches and retries
 * - All retries exhausted → circuit breaker counts the failure
 * - Circuit open → CircuitOpenError thrown before retry even starts
 */

export class TimeoutError extends Error {
  readonly timeout: number;

  constructor(ms: number) {
    super(`Operation timed out after ${ms}ms`);
    this.name = 'TimeoutError';
    this.timeout = ms;
  }
}

export class CircuitOpenError extends Error {
  readonly circuitName: string;

  constructor(name: string) {
    super(`Circuit breaker [${name}] is OPEN — service temporarily unavailable`);
    this.name = 'CircuitOpenError';
    this.circuitName = name;
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/* ------------------------------------------------------------------ */
/*  Transient-error detection                                         */
/* ------------------------------------------------------------------ */

const TRANSIENT_GRPC = new Set([4, 8, 13, 14]);
const TRANSIENT_NET = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EPIPE',
  'EAI_AGAIN',
  'ENOTFOUND',
]);

interface ErrorLike {
  name?: string;
  code?: unknown;
  status?: unknown;
  statusCode?: unknown;
}

/**
 * Heuristic: returns true when the error is likely transient
 * (timeout, overload, network blip) and the request is worth retrying.
 *
 * Covers:
 *   - TimeoutError (our own)
 *   - gRPC status codes 4/8/13/14 (Google Cloud TTS)
 *   - HTTP status 429 / 5xx       (Gemini, generic APIs)
 *   - Node.js system errors        (ECONNRESET, ETIMEDOUT …)
 */
export function isTransientError(err: unknown): boolean {
  const e = err as ErrorLike;
  if (e.name === 'TimeoutError') return true;

  if (typeof e.code === 'number' && TRANSIENT_GRPC.has(e.code)) return true;

  const httpCode = e.status || e.statusCode;
  if (typeof httpCode === 'number' && (httpCode === 429 || httpCode >= 500)) return true;

  if (typeof e.code === 'string' && TRANSIENT_NET.has(e.code)) return true;

  return false;
}

/* ------------------------------------------------------------------ */
/*  Timeout                                                           */
/* ------------------------------------------------------------------ */

/**
 * Wraps an async function with a timeout.
 * If the function doesn't resolve within `ms`, rejects with TimeoutError.
 */
export function withTimeout<T>(fn: () => T | Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
    Promise.resolve(fn())
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err: unknown) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/* ------------------------------------------------------------------ */
/*  Retry with exponential backoff                                    */
/* ------------------------------------------------------------------ */

interface RetryOptions {
  /** max retry attempts (0 = no retry) */
  retries?: number;
  /** base delay in ms */
  delay?: number;
  /** multiplier per attempt */
  backoff?: number;
  /** predicate(err) → boolean; default: retry all */
  shouldRetry?: (err: unknown) => boolean;
}

/**
 * Retries an async function with exponential backoff and jitter.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { retries = 2, delay = 1000, backoff = 2, shouldRetry }: RetryOptions = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries && (!shouldRetry || shouldRetry(err))) {
        const waitMs = delay * Math.pow(backoff, attempt);
        const jitter = waitMs * 0.25 * (Math.random() * 2 - 1);
        await sleep(Math.max(0, waitMs + jitter));
      } else {
        break;
      }
    }
  }
  throw lastError;
}

/* ------------------------------------------------------------------ */
/*  Circuit Breaker                                                   */
/* ------------------------------------------------------------------ */

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
  /** identifier for logging */
  name: string;
  /** failures before opening */
  threshold?: number;
  /** ms before trying half-open probe */
  resetTimeout?: number;
  /** predicate(err) → whether the error counts toward opening; default: every error */
  isFailure?: (err: unknown) => boolean;
}

/**
 * Circuit Breaker — prevents repeated calls to a failing service.
 *
 * States:
 *   CLOSED    → normal operation, failures counted
 *   OPEN      → all calls rejected immediately (CircuitOpenError)
 *   HALF_OPEN → one probe call allowed; success → CLOSED, failure → OPEN
 *
 * @example
 *   const breaker = new CircuitBreaker({ name: 'google-tts', threshold: 5, resetTimeout: 30000 });
 *   const result = await breaker.execute(() => callExternalService());
 */
export class CircuitBreaker {
  private static readonly registry = new Map<string, CircuitBreaker>();

  readonly name: string;
  readonly threshold: number;
  readonly resetTimeout: number;
  failureCount = 0;
  private state: CircuitState = 'CLOSED';
  private lastFailureTime = 0;
  private readonly isFailure: (err: unknown) => boolean;

  constructor({
    name,
    threshold = 5,
    resetTimeout = 30000,
    isFailure = () => true,
  }: CircuitBreakerOptions) {
    this.name = name;
    this.threshold = threshold;
    this.resetTimeout = resetTimeout;
    this.isFailure = isFailure;
    CircuitBreaker.registry.set(name, this);
  }

  static getAll(): ReadonlyMap<string, CircuitBreaker> {
    return CircuitBreaker.registry;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new CircuitOpenError(this.name);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      // An error the service answered with (bad input) shows it is up
      if (this.isFailure(err)) this.onFailure();
      else this.onSuccess();
      throw err;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.state === 'HALF_OPEN' || this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  getState(): CircuitState {
    if (this.state === 'OPEN' && Date.now() - this.lastFailureTime >= this.resetTimeout) {
      return 'HALF_OPEN';
    }
    return this.state;
  }
}
