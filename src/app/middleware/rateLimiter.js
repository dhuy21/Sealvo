const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getClient, isReady } = require('../core/redis');
const { TooManyRequestsError } = require('../errors/AppError');

function buildStore(prefix) {
  if (!isReady()) return undefined;
  return new RedisStore({
    sendCommand: (...args) => getClient().sendCommand(args),
    prefix: `rl:${prefix}:`,
  });
}

/**
 * Wraps a rate limiter to handle Redis store failures gracefully.
 * - TooManyRequestsError → forwarded to errorHandler (intentional 429)
 * - Any other error (store failure) → swallowed, request allowed through
 */
function safeLimiter(limiter) {
  return (req, res, next) => {
    limiter(req, res, (err) => {
      if (err instanceof TooManyRequestsError) return next(err);
      if (err) return next();
      next();
    });
  };
}

/**
 * Factory: creates a rate limiter wrapped with safeLimiter.
 * On limit exceeded, throws TooManyRequestsError into the error pipeline
 * instead of sending a raw JSON response (enables HTML/JSON auto-detection).
 */
function createLimiter({ message, ...config }) {
  return safeLimiter(
    rateLimit({
      ...config,
      handler: (_req, _res, next) => {
        next(new TooManyRequestsError(message));
      },
    })
  );
}

const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('login'),
  message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
});

const registerLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('register'),
  message: "Trop de tentatives d'inscription. Réessayez dans 15 minutes.",
});

const forgotPasswordLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('forgot'),
  message: 'Trop de demandes de réinitialisation. Réessayez dans 1 heure.',
});

const ttsLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('tts'),
  message: 'Trop de requêtes TTS. Réessayez dans 1 minute.',
});

const globalLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('global'),
  message: 'Trop de requêtes. Réessayez dans 1 minute.',
});

const emailLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('email'),
  message: "Trop d'emails envoyés. Réessayez dans 1 heure.",
});

const feedbackLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('feedback'),
  message: 'Trop de feedbacks envoyés. Réessayez dans 1 heure.',
});

module.exports = {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  ttsLimiter,
  globalLimiter,
  emailLimiter,
  feedbackLimiter,
};
