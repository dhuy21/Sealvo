const helmet = require('helmet');
const crypto = require('crypto');

/**
 * Generate CSP nonce for each request
 */
const nonceMiddleware = (req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
};

/**
 * Content Security Policy configuration
 */
const cspConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'strict-dynamic'",
        (req, res) => `'nonce-${res.locals.nonce}'`,
        "https://accounts.google.com",
        "https://apis.google.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Still needed for CSS
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com"
      ],
      fontSrc: [
        "'self'",
        "https://cdnjs.cloudflare.com",
        "https://fonts.gstatic.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "blob:"
      ],
      connectSrc: [
        "'self'",
        "https://accounts.google.com",
        "https://oauth2.googleapis.com",
        "https://www.googleapis.com",
        "https://cdn.jsdelivr.net" // Pour les source maps et ressources CDN
      ],
      frameSrc: [
        "'self'",
        "https://accounts.google.com"
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "blob:"],
      childSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"],
      scriptSrcElem: [
        "'self'",
        (req, res) => `'nonce-${res.locals.nonce}'`,
        "https://accounts.google.com",
        "https://apis.google.com"
      ],
      upgradeInsecureRequests: []
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  xssFilter: true
};

/**
 * Initialize all security middleware
 * @param {Express} app - Express application instance
 */
const initializeSecurity = (app) => {
  // Generate nonce for each request
  app.use(nonceMiddleware);
  
  // Apply security headers with CSP
  app.use(helmet(cspConfig));
};

module.exports = {
  initializeSecurity,
  nonceMiddleware,
  cspConfig
}; 