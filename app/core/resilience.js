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

class TimeoutError extends Error {
  constructor(ms) {
    super(`Operation timed out after ${ms}ms`);
    this.name = 'TimeoutError';
    this.timeout = ms;
  }
}

class CircuitOpenError extends Error {
  constructor(name) {
    super(`Circuit breaker [${name}] is OPEN — service temporarily unavailable`);
    this.name = 'CircuitOpenError';
    this.circuitName = name;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
function isTransientError(err) {
  if (err.name === 'TimeoutError') return true;

  if (typeof err.code === 'number' && TRANSIENT_GRPC.has(err.code)) return true;

  const httpCode = err.status || err.statusCode;
  if (typeof httpCode === 'number' && (httpCode === 429 || httpCode >= 500)) return true;

  if (typeof err.code === 'string' && TRANSIENT_NET.has(err.code)) return true;

  return false;
}

/* ------------------------------------------------------------------ */
/*  Timeout                                                           */
/* ------------------------------------------------------------------ */

/**
 * Wraps an async function with a timeout.
 * If the function doesn't resolve within `ms`, rejects with TimeoutError.
 *
 * @param {Function} fn   - async function to execute
 * @param {number}   ms   - timeout in milliseconds
 * @returns {Promise<*>}
 */
function withTimeout(fn, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
    Promise.resolve(fn())
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/* ------------------------------------------------------------------ */
/*  Retry with exponential backoff                                    */
/* ------------------------------------------------------------------ */

/**
 * Retries an async function with exponential backoff and jitter.
 *
 * @param {Function} fn                        - async function to execute
 * @param {Object}   [options]
 * @param {number}   [options.retries=2]       - max retry attempts (0 = no retry)
 * @param {number}   [options.delay=1000]      - base delay in ms
 * @param {number}   [options.backoff=2]       - multiplier per attempt
 * @param {Function} [options.shouldRetry]     - predicate(err) → boolean; default: retry all
 * @returns {Promise<*>}
 */
async function withRetry(fn, { retries = 2, delay = 1000, backoff = 2, shouldRetry } = {}) {
  let lastError;
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
class CircuitBreaker {
  static _registry = new Map();

  /**
   * @param {Object} options
   * @param {string} options.name           - identifier for logging
   * @param {number} [options.threshold=5]  - failures before opening
   * @param {number} [options.resetTimeout=30000] - ms before trying half-open probe
   */
  constructor({ name, threshold = 5, resetTimeout = 30000 }) {
    this.name = name;
    this.threshold = threshold;
    this.resetTimeout = resetTimeout;
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
    CircuitBreaker._registry.set(name, this);
  }

  static getAll() {
    return CircuitBreaker._registry;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new CircuitOpenError(this.name);
      }
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure();
      throw err;
    }
  }

  _onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
    }
  }

  _onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.state === 'HALF_OPEN' || this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  getState() {
    if (this.state === 'OPEN' && Date.now() - this.lastFailureTime >= this.resetTimeout) {
      return 'HALF_OPEN';
    }
    return this.state;
  }
}

module.exports = {
  withTimeout,
  withRetry,
  CircuitBreaker,
  TimeoutError,
  CircuitOpenError,
  isTransientError,
};
