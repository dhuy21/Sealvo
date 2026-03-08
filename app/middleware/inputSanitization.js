const { sanitizeInput } = require('./sanitization');

const sanitizationRoutes = {
  registration: {
    path: '/registre',
    fields: {
      username: 'username',
      email: 'email',
    },
  },
  googleAuth: {
    path: '/auth/google/callback',
    fields: {
      username: 'username',
      email: 'email',
    },
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
      subject: 'text',
    },
  },
};

const generalSanitizationMiddleware = (req, res, next) => {
  if (req.method === 'POST' && req.body) {
    const sanitizer = sanitizeInput();
    sanitizer(req, res, next);
  } else {
    next();
  }
};

const initializeInputSanitization = (app) => {
  Object.entries(sanitizationRoutes).forEach(([_name, config]) => {
    app.use(config.path, sanitizeInput(config.fields));
  });
  app.use(generalSanitizationMiddleware);
};

module.exports = {
  initializeInputSanitization,
  sanitizationRoutes,
  generalSanitizationMiddleware,
};
