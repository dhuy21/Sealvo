const path = require('path');
const express = require('express');
const morgan = require('morgan');
const route = require('./app/routes');
const { engine } = require('express-handlebars');
const { escapeHelper } = require('./app/middleware/sanitization');
const { initializeMiddleware } = require('./app/middleware');

/**
 * Create and return the Express app (middleware + routes).
 * Used by app.js for the server and by tests for Supertest.
 * @returns {express.Express}
 */
function getApp() {
  const app = express();

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

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

  // Healthcheck pour Railway / load balancers (sans auth, léger)
  app.get('/health', (req, res) => {
    res.status(200).json({ ok: true });
  });

  route(app);
  app.use(morgan('combined'));

  return app;
}

module.exports = { getApp };
