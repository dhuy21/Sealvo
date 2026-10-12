const helmet = require('helmet');
const crypto = require('crypto');

const nonceMiddleware = (req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
};

const PERMISSIONS_POLICY = [
  'camera=()',
  'geolocation=()',
  'payment=()',
  'usb=()',
  'interest-cohort=()',
  'browsing-topics=()',
  'microphone=(self)',
  'autoplay=(self)',
].join(', ');

const permissionsPolicyMiddleware = (req, res, next) => {
  res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
  next();
};

const cspConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'strict-dynamic'",
        (req, res) => `'nonce-${res.locals.nonce}'`,
        'https://accounts.google.com',
        'https://apis.google.com',
      ],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
      fontSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: [
        "'self'",
        'https://accounts.google.com',
        'https://oauth2.googleapis.com',
        'https://www.googleapis.com',
      ],
      frameSrc: ["'self'", 'https://accounts.google.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", 'blob:'],
      childSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'", 'blob:'],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  xssFilter: true,
};

const initializeSecurity = (app) => {
  app.use(nonceMiddleware);
  app.use(permissionsPolicyMiddleware);
  app.use(helmet(cspConfig));
};

module.exports = {
  initializeSecurity,
  nonceMiddleware,
  cspConfig,
};
