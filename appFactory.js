const path = require('path');
const express = require('express');
const compression = require('compression');
const morgan = require('morgan');
const route = require('./app/routes');
const { engine } = require('express-handlebars');
const { escapeHelper } = require('./app/middleware/sanitization');
const { initializeMiddleware } = require('./app/middleware');
const { isReady: redisReady } = require('./app/core/redis');
const { isReady: rabbitmqReady } = require('./app/core/rabbitmq');
const { globalLimiter } = require('./app/middleware/rateLimiter');
const notFoundHandler = require('./app/middleware/notFoundHandler');
const errorHandler = require('./app/middleware/errorHandler');

/**
 * Create and return the Express app (middleware + routes).
 * Used by app.js for the server and by tests for Supertest.
 * @returns {express.Express}
 */
function getApp() {
  const app = express();

  app.use(
    compression({
      filter: (req, res) => {
        if (res.getHeader('Content-Type')?.includes('text/event-stream')) return false;
        return compression.filter(req, res);
      },
      threshold: 1024,
    })
  );

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  const isProduction = process.env.NODE_ENV === 'production';
  app.use(
    express.static(path.join(__dirname, 'public'), {
      maxAge: isProduction ? '1d' : 0,
      etag: true,
      lastModified: true,
    })
  );

  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache');
    next();
  });

  const morganFormat =
    process.env.NODE_ENV === 'production'
      ? ':remote-addr :method :url :status :res[content-length] - :response-time ms'
      : ':method :url :status :response-time ms';

  app.use(
    morgan(morganFormat, {
      skip: (req) => req.path === '/health',
    })
  );
  app.use(globalLimiter);

  initializeMiddleware(app);

  app.engine(
    'hbs',
    engine({
      extname: '.hbs',
      helpers: {
        json: function (context) {
          return JSON.stringify(context);
        },
        firstLetter: function (username) {
          return username ? escapeHelper(username).charAt(0).toUpperCase() : 'U';
        },
        for: function (from, to, options) {
          let result = '';
          for (let i = from; i <= to; i++) {
            result += options.fn(i);
          }
          return result;
        },
        eq: function (a, b) {
          return a == b;
        },
        escape: escapeHelper,
        safeUsername: function (username) {
          return escapeHelper(username || 'Utilisateur');
        },
        safeText: function (text) {
          return escapeHelper(text || '');
        },
      },
    })
  );

  app.set('view engine', 'hbs');
  app.set('views', path.join(__dirname, 'app/views'));

  // Healthcheck pour Railway / load balancers (sans auth, léger).
  // DB est critique (503 si down). Redis est optionnel : l'app fonctionne en fallback MemoryStore.
  app.get('/health', (req, res) => {
    const dbOk = !!global.dbConnection;
    const redisOk = redisReady();
    const rmqOk = rabbitmqReady();
    res.status(dbOk ? 200 : 503).json({ ok: dbOk, db: dbOk, redis: redisOk, rabbitmq: rmqOk });
  });

  route(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { getApp };
