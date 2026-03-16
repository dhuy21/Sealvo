const { validationResult } = require('express-validator');
const { ValidationError } = require('../errors/AppError');
const { setFlash } = require('../middleware/flash');

/**
 * Generic validation middleware factory for API/JSON routes.
 * Runs an array of express-validator chains, then collects errors
 * into a structured ValidationError with per-field details.
 *
 * Usage: router.post('/path', validate(schema), asyncHandler(controller.method))
 */
function validate(schemas) {
  return async (req, res, next) => {
    try {
      for (const schema of schemas) {
        await schema.run(req);
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const details = errors.array().map((err) => ({
          field: err.path,
          message: err.msg,
          value: err.value,
        }));
        return next(new ValidationError('Données de validation invalides', details));
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Validation middleware for HTML form routes.
 * Same schema execution as validate(), but on failure redirects back
 * with a flash message instead of sending a JSON ValidationError.
 *
 * Usage: router.post('/login', validateForm(loginSchema, '/login'), asyncHandler(ctrl.loginPost))
 */
function validateForm(schemas, redirectUrl) {
  return async (req, res, next) => {
    try {
      for (const schema of schemas) {
        await schema.run(req);
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const messages = errors.array().map((err) => err.msg);
        setFlash(req, 'error', messages.join('. '));
        return res.redirect(redirectUrl);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { validate, validateForm };
