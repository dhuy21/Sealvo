const session = require('express-session');
const crypto = require('crypto');

/**
 * Generate secure session secret
 */
const generateSecureSecret = () => {
  if (process.env.NODE_ENV === 'production') {
    // En production, utiliser un secret basé sur l'environnement + date pour rotation automatique
    const baseSecret = process.env.SESSION_SECRET;
    const dateRotation = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7)); // Rotation hebdomadaire
    return crypto.createHash('sha256').update(`${baseSecret}-${dateRotation}`).digest('hex');
  }
  // En développement, secret aléatoire OK
  return crypto.randomBytes(64).toString('hex');
};

/**
 * Session configuration
 */
const sessionConfig = {
  secret: generateSecureSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 3 * 60 * 60 * 1000, // 3 hours
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