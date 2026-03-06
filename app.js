const path = require('path');

// Toutes les variables sont centralisées dans src/.env (un seul fichier).
// En container : Compose injecte les variables via env_file ; dotenv ne surcharge pas les variables déjà présentes.
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = require('./app/core/database.js');
const redis = require('./app/core/redis.js');

// Railway injects PORT; .env provides fallback for local/docker.
const appPort = parseInt(process.env.PORT || '3000', 10);
const host = '0.0.0.0'; // required for container: accept connections from outside (e.g. Railway proxy)

(async () => {
  try {
    global.dbConnection = await db.connect();
    console.log('[db] Connected.');

    await redis.connect();

    // Require AFTER Redis is connected so that modules like rateLimiter.js
    // see isReady() = true and create their stores with RedisStore.
    const { getApp } = require('./appFactory');
    const app = getApp();
    const server = app.listen(appPort, host);
    console.log(`App listening at http://${host}:${appPort}`);

    const gracefulShutdown = (signal) => {
      console.log(`${signal} received, shutting down gracefully...`);

      // Force exit after 10s if connections don't close (keep-alive clients, SSE, etc.)
      const forceExitTimer = setTimeout(() => {
        console.error('[shutdown] Timeout reached — forcing exit.');
        process.exit(1);
      }, 10000);
      forceExitTimer.unref(); // Don't keep process alive if everything else closes first

      server.close(async () => {
        console.log('HTTP server closed.');
        try {
          await redis.disconnect();
          if (global.dbConnection && global.dbConnection.end) await global.dbConnection.end();
          process.exit(0);
        } catch (err) {
          console.error('Error during shutdown:', err);
          process.exit(1);
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
