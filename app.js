const path = require('path');

// Toutes les variables sont centralisées dans src/.env (un seul fichier).
// En container : Compose injecte les variables via env_file ; dotenv ne surcharge pas les variables déjà présentes.
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = require('./app/core/database.js');
const { getApp } = require('./appFactory');

// Railway/Heroku inject PORT; local/docker use APP_PORT or 3000
const appPort = process.env.PORT;
const host = '0.0.0.0'; // required for container: accept connections from outside (e.g. Railway proxy)

(async () => {
  try {
    console.log('Tentative de connexion à la base de données...');
    global.dbConnection = await db.connect();
    console.log('Base de données connectée avec succès');

    const app = getApp();
    const server = app.listen(appPort, host);
    console.log(`App listening at http://${host}:${appPort}`);

    const gracefulShutdown = (signal) => {
      console.log(`${signal} received, shutting down gracefully...`);
      server.close(() => {
        console.log('HTTP server closed.');
        if (global.dbConnection && global.dbConnection.end) {
          global.dbConnection
            .end()
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
  } catch (error) {
    console.error('Erreur de connexion à la base de données:', error);
    console.error("Variables d'environnement DB:", {
      host: process.env.MYSQLHOST,
      user: process.env.MYSQLUSER,
      database: process.env.MYSQL_DATABASE,
      port: process.env.MYSQLPORT,
      password: process.env.MYSQL_ROOT_PASSWORD ? '[MASQUÉ]' : 'NON DÉFINI',
    });
    process.exit(1);
  }
})();
