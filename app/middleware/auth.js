const crypto = require('crypto');
const { setFlash } = require('./flash');

const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  setFlash(req, 'error', 'Vous devez être connecté pour accéder à cette page');
  res.redirect('/login');
};

const isAuthenticatedAPI = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  res.status(401).json({ success: false, message: 'Vous devez être connecté' });
};

const requireCronSecret = (req, res, next) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('[api/reminder] CRON_SECRET is not set — endpoint disabled.');
    return res.status(503).json({ success: false, message: 'Service not configured.' });
  }
  const providedSecret = req.headers['x-cron-secret'] || '';
  if (
    providedSecret.length !== secret.length ||
    !crypto.timingSafeEqual(Buffer.from(providedSecret), Buffer.from(secret))
  ) {
    return res.status(403).json({ success: false, message: 'Forbidden.' });
  }
  next();
};

module.exports = { isAuthenticated, isAuthenticatedAPI, requireCronSecret };
