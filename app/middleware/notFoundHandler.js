const { NotFoundError } = require('../errors/AppError');

/**
 * Catch-all for unmatched routes.
 * Placed AFTER all route registrations and BEFORE the global error handler.
 */
function notFoundHandler(req, res, next) {
  next(new NotFoundError(`La route ${req.method} ${req.originalUrl} n'existe pas`));
}

module.exports = notFoundHandler;
