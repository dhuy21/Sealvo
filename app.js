const db = require('./app/core/database.js');
const path = require('path');
const dotenv = require('dotenv').config({ path: path.join(__dirname, 'app/config/.env') });
const express = require('express');
const route = require('./app/routes');
const morgan = require('morgan');
const { engine } = require('express-handlebars');
const session = require('express-session');
const helmet = require('helmet');
const { sanitizeInput, escapeHelper } = require('./app/middleware/sanitization');
const app = express();
const port = process.env.PORT || 3000;
const crypto = require('crypto');


app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Input sanitization middleware for user registration and sensitive routes
app.use('/registre', sanitizeInput({
  username: 'username',
  email: 'email',
  password: 'text'
}));

app.use('/auth/google/callback', sanitizeInput({
  username: 'username',
  email: 'email'
}));

// Sanitize word-related inputs
app.use('/addWord', sanitizeInput({
  word: 'text',
  meaning: 'text',
  synonyms: 'text',
  antonyms: 'text',
  example: 'text',
  grammar: 'text',
  pronunciation: 'text',
  subject: 'text'
}));

// General sanitization for other POST routes
app.use((req, res, next) => {
  if (req.method === 'POST' && req.body) {
    const sanitizer = sanitizeInput();
    sanitizer(req, res, next);
  } else {
    next();
  }
});


app.use(express.static(path.join(__dirname, 'public')));

// Initialize database connection and store it globally
(async () => {
  try {
    global.dbConnection = await db.connect();
    console.log('Base de données connectée avec succès');
  } catch (error) {
    console.error('Erreur de connexion à la base de données:', error);
  }
})();

// Generate CSP nonce for each request
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

// Security middleware with strict nonce-based CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        (req, res) => `'nonce-${res.locals.nonce}'`, // Use nonce instead of unsafe-inline
        "https://accounts.google.com",
        "https://apis.google.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Still needed for CSS (safer than script inline)
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
        "data:", // Allow data URLs for images
        "https:", // Allow HTTPS images (for avatars, etc.)
        "blob:" // Allow blob URLs
      ],
      connectSrc: [
        "'self'",
        "https://accounts.google.com",
        "https://oauth2.googleapis.com",
        "https://www.googleapis.com"
      ],
      frameSrc: [
        "'self'",
        "https://accounts.google.com"
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      childSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: [],
      // Additional security directives
      manifestSrc: ["'self'"],
      workerSrc: ["'self'"],
      // Block dangerous script evaluation
      scriptSrcElem: [
        "'self'",
        (req, res) => `'nonce-${res.locals.nonce}'`,
        "https://accounts.google.com",
        "https://apis.google.com"
      ]
    },
  },
  crossOriginEmbedderPolicy: false, // Disable COEP for compatibility
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  // Additional security headers
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
}));

// Generate a random secret on each server start
const secret = crypto.randomBytes(64).toString('hex');
app.use(session({
    secret: secret,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 heures
}));

// Make user data available to all templates
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

//Route init
route(app);

app.use(morgan('combined'));
//Template engine
app.engine('hbs', engine({ 
  extname: '.hbs',
  // Register Handlebars helpers
  helpers: {
    json: function(context) {
      return JSON.stringify(context);
    },
    firstLetter: function(username) {
      return username ? escapeHelper(username).charAt(0).toUpperCase() : 'U';
    },
    for: function(from, to, options) {
      let result = '';
      for (let i = from; i <= to; i++) {
        result += options.fn(i);
      }
      return result;
    },
    eq: function(a, b) {
      return a == b;
    },
    // Safe escaping helper to prevent XSS in templates
    escape: escapeHelper,
    // Safe username display
    safeUsername: function(username) {
      return escapeHelper(username || 'Utilisateur');
    },
    // Safe text display
    safeText: function(text) {
      return escapeHelper(text || '');
    }
  }
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'app/views'));

const server = app.listen(port, () =>
    console.log(`App listening at http://localhost:${port}`),
);

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
    // Close database pool
    if (global.dbConnection && global.dbConnection.end) {
      global.dbConnection.end().then(() => {
        console.log('Database pool closed.');
        process.exit(0);
      }).catch((err) => {
        console.error('Error closing database pool:', err);
        process.exit(1);
      });
    } else {
      process.exit(0);
    }
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
    // Close database pool
    if (global.dbConnection && global.dbConnection.end) {
      global.dbConnection.end().then(() => {
        console.log('Database pool closed.');
        process.exit(0);
      }).catch((err) => {
        console.error('Error closing database pool:', err);
        process.exit(1);
      });
    } else {
      process.exit(0);
    }
  });
});