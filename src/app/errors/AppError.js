/**
 * Base class for all operational (expected) errors.
 * Non-operational (programming) errors remain plain Error instances
 * and are treated as 500 by the global error handler.
 */
class AppError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Données invalides', details = null) {
    super(message, 400, details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Vous devez être connecté') {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Accès refusé') {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Ressource non trouvée') {
    super(message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflit de données') {
    super(message, 409);
  }
}

class TooManyRequestsError extends AppError {
  constructor(message = 'Trop de requêtes. Veuillez réessayer plus tard.') {
    super(message, 429);
  }
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
};
