const { sanitizeInput } = require('./sanitization');

/**
 * Route-specific sanitization configurations
 */
const sanitizationRoutes = {
  registration: {
    path: '/registre',
    fields: {
      username: 'username',
      email: 'email',
      password: 'text'
    }
  },
  googleAuth: {
    path: '/auth/google/callback',
    fields: {
      username: 'username',
      email: 'email'
    }
  },
  addWord: {
    path: '/addWord',
    fields: {
      word: 'text',
      meaning: 'text',
      synonyms: 'text',
      antonyms: 'text',
      example: 'text',
      grammar: 'text',
      pronunciation: 'text',
      subject: 'text'
    }
  }
};

/**
 * General POST sanitization middleware
 */
const generalSanitizationMiddleware = (req, res, next) => {
  if (req.method === 'POST' && req.body) {
    const sanitizer = sanitizeInput();
    sanitizer(req, res, next);
  } else {
    next();
  }
};

/**
 * Initialize input sanitization middleware
 * @param {Express} app - Express application instance
 */
const initializeInputSanitization = (app) => {
  // Apply route-specific sanitization
  Object.entries(sanitizationRoutes).forEach(([name, config]) => {
    app.use(config.path, sanitizeInput(config.fields));
    console.log(`Input sanitization configured for ${config.path}`);
  });

  // Apply general sanitization for all POST routes
  app.use(generalSanitizationMiddleware);
  console.log('General input sanitization middleware initialized');
};

module.exports = {
  initializeInputSanitization,
  sanitizationRoutes,
  generalSanitizationMiddleware
}; 