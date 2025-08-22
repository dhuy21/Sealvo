const session = require('express-session');
const crypto = require('crypto');

/**
 * Generate secure session secret
 */
const generateSecureSecret = () => {
  if (process.env.NODE_ENV === 'production') {
    // En production, utiliser un secret basé sur l'environnement + date pour rotation automatique
    const baseSecret = process.env.SESSION_SECRET;
    
    if (!baseSecret) {
      console.error('🚨 SESSION_SECRET is required in production!');
      console.error('💡 Add SESSION_SECRET to your Railway environment variables');
      return 'fallback-secret-for-debugging-only';
    }
    
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
  // Trust proxy for Railway (CRUCIAL for HTTPS cookies)
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
    console.log('🔐 Trust proxy enabled for Railway');
    console.log('🔐 Session Config:', {
      hasSecret: !!sessionConfig.secret,
      secretLength: sessionConfig.secret?.length,
      cookieSecure: sessionConfig.cookie.secure,
      cookieMaxAge: sessionConfig.cookie.maxAge,
      environment: process.env.NODE_ENV
    });
  }
  
  // Configure session middleware
  app.use(session(sessionConfig));
  
  // Debug middleware for production
  if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      console.log('🔍 Session Debug:', {
        sessionID: req.sessionID,
        hasSession: !!req.session,
        sessionData: req.session ? Object.keys(req.session) : 'no session',
        hasUser: !!req.session?.user,
        cookieSecure: req.session?.cookie?.secure,
        protocol: req.protocol,
        isSecure: req.secure,
        headers: {
          'x-forwarded-proto': req.headers['x-forwarded-proto'],
          'x-forwarded-for': req.headers['x-forwarded-for']
        }
      });
      next();
    });
  }
  
  // Make user data available to all templates
  app.use(userSessionMiddleware);
};

module.exports = {
  initializeSession,
  sessionConfig,
  userSessionMiddleware
}; 