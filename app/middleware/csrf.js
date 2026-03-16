const crypto = require('crypto');
const { isProductionLike } = require('../config/environment');

const CSRF_COOKIE = '__csrf';
const CSRF_HEADER = 'x-csrf-token';
const CSRF_BODY_FIELD = '_csrf';
const TOKEN_BYTES = 32;

const EXCLUDED_PREFIXES = ['/health', '/api/reminder'];

function isExcluded(path) {
  return EXCLUDED_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + '/'));
}

function parseCookieValue(cookieHeader, name) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

function generateToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex');
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function csrfTokenMiddleware(req, res, next) {
  let token = parseCookieValue(req.headers.cookie, CSRF_COOKIE);

  if (!token) {
    token = generateToken();
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      secure: isProductionLike(),
      sameSite: 'lax',
      path: '/',
    });
  }

  res.locals.csrfToken = token;
  next();
}

function csrfVerifyMiddleware(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  if (isExcluded(req.path)) {
    return next();
  }

  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  const cookieToken = parseCookieValue(req.headers.cookie, CSRF_COOKIE);
  const submittedToken = req.headers[CSRF_HEADER] || req.body?.[CSRF_BODY_FIELD];

  if (!cookieToken || !submittedToken || !safeEqual(cookieToken, submittedToken)) {
    return res.status(403).json({ success: false, message: 'CSRF token invalide.' });
  }

  next();
}

const initializeCsrf = (app) => {
  app.use(csrfTokenMiddleware);
  app.use(csrfVerifyMiddleware);
};

module.exports = { initializeCsrf, csrfTokenMiddleware, csrfVerifyMiddleware };
