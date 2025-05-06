const db = require('./app/core/database.js');
const config = require('./app/config/env');
const path = require('path');
const express = require('express');
const route = require('./app/routes');
const morgan = require('morgan');
const { engine } = require('express-handlebars');
const session = require('express-session');
const app = express();
const port = process.env.PORT || config.PORT;
const crypto = require('crypto');


app.use(express.urlencoded({ extended: true }));
app.use(express.json());


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
      return username ? username.charAt(0).toUpperCase() : 'U';
    }
  }
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'app/views'));

app.listen(port, () =>
    console.log(`App listening at http://localhost:${port}`),
);