/**
 * Centralized authentication middleware
 *
 * isAuthenticated      – for page routes (redirects to /login with flash message)
 * isAuthenticatedAPI   – for API / fetch routes (returns 401 JSON)
 */

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

module.exports = { isAuthenticated, isAuthenticatedAPI };
