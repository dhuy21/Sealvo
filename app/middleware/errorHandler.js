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
 * Central Express error-handling middleware (4 args signature).
 * Must be registered AFTER all routes and AFTER notFoundHandler.
 *
 * - Operational errors  → known status code + safe message
 * - Programming errors  → 500 + generic message (details hidden in production)
 */

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const isOperational = err instanceof AppError && err.isOperational;
  const statusCode = isOperational ? err.statusCode : 500;

  if (!isOperational) {
    console.error('[ErrorHandler] Unexpected error:', err);
  }

  const clientMessage = isOperational
    ? err.message
    : 'Une erreur interne est survenue. Veuillez réessayer plus tard.';

  if (expectsJson(req)) {
    const body = { success: false, message: clientMessage };

    if (err.details) body.details = err.details;
    if (process.env.NODE_ENV === 'development' && !isOperational) {
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
