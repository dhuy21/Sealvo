const session = require('express-session');
const crypto = require('crypto');
const { RedisStore } = require('connect-redis');
const { getClient } = require('../core/redis');
const { isProductionLike } = require('../config/environment');

const getSessionSecret = () => {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (isProductionLike()) {
    console.warn(
      '[session] SESSION_SECRET is not set — sessions will be invalidated on every restart!'
    );
  }
  return crypto.randomBytes(64).toString('hex');
};

const userSessionMiddleware = (req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
};

const initializeSession = (app) => {
  // buildStore() is called here — after redis.connect() in app.js — so getClient() is valid.
  const redisClient = getClient();
  let store;

  if (redisClient) {
    store = new RedisStore({
      client: redisClient,
      prefix: 'sess:',
      ttl: 3 * 60 * 60,
      touchAfter: 5 * 60,
    });
    console.log('[session] Using RedisStore.');
  } else {
    console.warn('[session] No Redis — falling back to MemoryStore (not for production).');
  }

  const sessionConfig = {
    name: '__sid', // Don't expose the framework (default 'connect.sid' fingerprints Express)
    store,
    secret: getSessionSecret(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 3 * 60 * 60 * 1000,
      secure: isProductionLike(),
      httpOnly: true,
      sameSite: 'lax',
    },
  };

  if (isProductionLike()) app.set('trust proxy', 1);
  app.use(session(sessionConfig));
  app.use(userSessionMiddleware);
};

module.exports = { initializeSession, userSessionMiddleware };
