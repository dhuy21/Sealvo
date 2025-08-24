const db = require('./app/core/database.js');
const path = require('path');
const dotenv = require('dotenv').config({ path: path.join(__dirname, 'app/config/.env') });
const express = require('express');
const route = require('./app/routes');
const morgan = require('morgan');
const { engine } = require('express-handlebars');
const { escapeHelper } = require('./app/middleware/sanitization');
const { initializeMiddleware } = require('./app/middleware');

const app = express();
const port = process.env.PORT || 3000;

// Basic Express middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize all security middleware (CSP, session, sanitization)
initializeMiddleware(app);


// Initialize database connection
(async () => {
  try {
    global.dbConnection = await db.connect();
    console.log('Base de données connectée avec succès');
  } catch (error) {
    console.error('Erreur de connexion à la base de données:', error);
  }
})();

// Initialize routes
route(app);

// Logging middleware
app.use(morgan('combined'));

// Template engine configuration
app.engine('hbs', engine({ 
  extname: '.hbs',
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
    // Safe escaping helpers to prevent XSS in templates
    escape: escapeHelper,
    safeUsername: function(username) {
      return escapeHelper(username || 'Utilisateur');
    },
    safeText: function(text) {
      return escapeHelper(text || '');
    }
  }
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'app/views'));

// Start server
const server = app.listen(port, '0.0.0.0');
console.log(`App listening at http://0.0.0.0:${port}`);

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`${signal} received, shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    
    // Close database pool
    if (global.dbConnection && global.dbConnection.end) {
      global.dbConnection.end()
        .then(() => {
          console.log('Database pool closed.');
          process.exit(0);
        })
        .catch((err) => {
          console.error('Error closing database pool:', err);
          process.exit(1);
        });
    } else {
      process.exit(0);
    }
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));