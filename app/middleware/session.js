const session = require('express-session');
const crypto = require('crypto');

/**
 * Session configuration
 */
const sessionConfig = {
  secret: crypto.randomBytes(64).toString('hex'), // Generate random secret on each server start
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS attacks on cookies
    sameSite: 'lax' // CSRF protection
  }
};

/**
 * User session middleware - makes user data available to templates
 */
const userSessionMiddleware = (req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
};

/**
 * Initialize session middleware
 * @param {Express} app - Express application instance
 */
const initializeSession = (app) => {
  // Configure session middleware
  app.use(session(sessionConfig));
  
  // Make user data available to all templates
  app.use(userSessionMiddleware);
};

module.exports = {
  initializeSession,
  sessionConfig,
  userSessionMiddleware
}; 