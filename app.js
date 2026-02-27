const path = require('path');

// Toutes les variables sont centralisées dans src/.env (un seul fichier).
// En container : Compose injecte les variables via env_file ; dotenv ne surcharge pas les variables déjà présentes.
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = require('./app/core/database.js');
const { getApp } = require('./appFactory');

const port = process.env.PORT || 3000;

(async () => {
  try {
    console.log('Tentative de connexion à la base de données...');
    global.dbConnection = await db.connect();
    console.log('Base de données connectée avec succès');

    const app = getApp();
    const server = app.listen(port, '0.0.0.0');
    console.log(`App listening at http://localhost:${port}`);

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
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      database: process.env.DB_DATABASE,
      port: process.env.DB_PORT,
      password: process.env.DB_PASSWORD ? '[MASQUÉ]' : 'NON DÉFINI',
    });
    process.exit(1);
  }
})();
