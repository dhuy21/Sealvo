const path = require('path');

// Toutes les variables sont centralisées dans src/.env (un seul fichier).
// En container : Compose injecte les variables via env_file ; dotenv ne surcharge pas les variables déjà présentes.
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = require('./app/core/database.js');
const redis = require('./app/core/redis.js');
const rabbitmq = require('./app/core/rabbitmq.js');
const emailQueue = require('./app/queues/emailQueue.js');
const importQueue = require('./app/queues/importQueue.js');

const appPort = parseInt(process.env.PORT || '3000', 10);
const host = '0.0.0.0';

(async () => {
  try {
    global.dbConnection = await db.connect();
    console.log('[db] Connected.');

    await redis.connect();

    for (let attempt = 1; attempt <= 5; attempt++) {
      await rabbitmq.connect();
      if (rabbitmq.isReady()) break;
      if (attempt < 5) {
        const delay = Math.min(2000 * attempt, 10000);
        console.warn(`[rabbitmq] Not ready (attempt ${attempt}/5) — retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    if (rabbitmq.isReady()) {
      await emailQueue.setupTopology();
      await importQueue.setupTopology();
    } else {
      console.warn('[rabbitmq] Unavailable — app starts in fallback mode (sync emails).');
    }

    const { getApp } = require('./appFactory');
    const app = getApp();
    const server = app.listen(appPort, host);
    console.log(`App listening at http://${host}:${appPort}`);

    const gracefulShutdown = (signal) => {
      console.log(`${signal} received, shutting down gracefully...`);

      const forceExitTimer = setTimeout(() => {
        console.error('[shutdown] Timeout reached — forcing exit.');
        process.exit(1);
      }, 10000);
      forceExitTimer.unref();

      server.close(async () => {
        console.log('HTTP server closed.');
        try {
          await rabbitmq.disconnect();
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
