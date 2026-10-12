const { AppError } = require('../errors/AppError');

/**
 * Determine whether the client expects a JSON response.
 *
 * Checks (in order): /api/ prefix, XHR header, Accept header,
 * Content-Type JSON, non-GET without text/html Accept.
 */
function expectsJson(req) {
  if (req.path.startsWith('/api/')) return true;
  if (req.xhr) return true;
  const accept = req.headers.accept || '';
  if (accept.includes('application/json')) return true;
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('application/json')) return true;
  if (req.method !== 'GET' && !accept.includes('text/html')) return true;
  return false;
}

/**
 * Known infrastructure errors from the resilience layer.
 * Matched by err.name (no hard import) to keep coupling loose.
 */
const INFRA_ERRORS = {
  TimeoutError: {
    status: 504,
    message: 'Le service externe ne répond pas. Veuillez réessayer.',
  },
  CircuitOpenError: {
    status: 503,
    message: 'Service temporairement indisponible. Veuillez réessayer dans quelques instants.',
  },
};

/**
 * Central Express error-handling middleware (4 args signature).
 * Must be registered AFTER all routes and AFTER notFoundHandler.
 *
 * Error categories:
 *   1. Operational (AppError)       → known status + safe message
 *   2. Infrastructure (resilience)  → 503/504 + safe message + log
 *   3. Unexpected (programming)     → 500 + generic message + log
 */

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const isOperational = err instanceof AppError && err.isOperational;
  const infraMapping = INFRA_ERRORS[err.name];

  let statusCode, clientMessage, shouldLog;

  if (isOperational) {
    statusCode = err.statusCode;
    clientMessage = err.message;
    shouldLog = false;
  } else if (infraMapping) {
    statusCode = infraMapping.status;
    clientMessage = infraMapping.message;
    shouldLog = true;
    console.error(`[ErrorHandler] Infrastructure error (${err.name}):`, err.message);
  } else {
    statusCode = 500;
    clientMessage = 'Une erreur interne est survenue. Veuillez réessayer plus tard.';
    shouldLog = true;
    console.error('[ErrorHandler] Unexpected error:', err);
  }

  if (expectsJson(req)) {
    const body = { success: false, message: clientMessage };

    if (err.details) body.details = err.details;
    if (process.env.NODE_ENV === 'development' && shouldLog) {
      body.stack = err.stack;
    }
    return res.status(statusCode).json(body);
  }

  return res.status(statusCode).render('error', {
    title: 'Erreur',
    message: clientMessage,
    error: process.env.NODE_ENV === 'development' ? err.stack : null,
    user: req.session?.user,
  });
}

module.exports = errorHandler;
