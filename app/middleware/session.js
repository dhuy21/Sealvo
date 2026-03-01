const session = require('express-session');
const crypto = require('crypto');
const { isProductionLike } = require('../config/env');

const generateSecureSecret = () => {
  if (isProductionLike()) {
    const base = process.env.SESSION_SECRET;
    const week = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7));
    return crypto.createHash('sha256').update(`${base}-${week}`).digest('hex');
  }
  return crypto.randomBytes(64).toString('hex');
};

const sessionConfig = {
  secret: generateSecureSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 3 * 60 * 60 * 1000,
    secure: isProductionLike(),
    httpOnly: true,
    sameSite: 'lax',
  },
};

const userSessionMiddleware = (req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
};

const initializeSession = (app) => {
  if (isProductionLike()) app.set('trust proxy', 1);
  app.use(session(sessionConfig));
  app.use(userSessionMiddleware);
};

module.exports = { initializeSession, sessionConfig, userSessionMiddleware };
