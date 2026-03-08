const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getClient, isReady } = require('../core/redis');

function buildStore(prefix) {
  if (!isReady()) return undefined;
  return new RedisStore({
    sendCommand: (...args) => getClient().sendCommand(args),
    prefix: `rl:${prefix}:`,
  });
}

function safeLimiter(limiter) {
  return (req, res, next) => {
    limiter(req, res, (err) => {
      if (err) return next();
      next();
    });
  };
}

const loginLimiter = safeLimiter(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    store: buildStore('login'),
    message: {
      success: false,
      message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
    },
  })
);

const registerLimiter = safeLimiter(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    store: buildStore('register'),
    message: {
      success: false,
      message: "Trop de tentatives d'inscription. Réessayez dans 15 minutes.",
    },
  })
);

const forgotPasswordLimiter = safeLimiter(
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    store: buildStore('forgot'),
    message: {
      success: false,
      message: 'Trop de demandes de réinitialisation. Réessayez dans 1 heure.',
    },
  })
);

const ttsLimiter = safeLimiter(
  rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    store: buildStore('tts'),
    message: { success: false, message: 'Trop de requêtes TTS. Réessayez dans 1 minute.' },
  })
);

const globalLimiter = safeLimiter(
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    store: buildStore('global'),
    message: { success: false, message: 'Trop de requêtes. Réessayez dans 1 minute.' },
  })
);

const emailLimiter = safeLimiter(
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    store: buildStore('email'),
    message: { success: false, message: "Trop d'emails envoyés. Réessayez dans 1 heure." },
  })
);

const feedbackLimiter = safeLimiter(
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    store: buildStore('feedback'),
    message: { success: false, message: 'Trop de feedbacks envoyés. Réessayez dans 1 heure.' },
  })
);

module.exports = {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  ttsLimiter,
  globalLimiter,
  emailLimiter,
  feedbackLimiter,
};
