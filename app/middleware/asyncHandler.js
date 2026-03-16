/**
 * Wraps an async route handler so that rejected promises
 * are forwarded to Express's error-handling pipeline via next(err).
 *
 * Usage:  router.post('/foo', asyncHandler(controller.method))
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
