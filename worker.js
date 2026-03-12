const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = require('./app/core/database.js');
const redis = require('./app/core/redis.js');
const rabbitmq = require('./app/core/rabbitmq.js');
const emailQueue = require('./app/queues/emailQueue.js');
const importQueue = require('./app/queues/importQueue.js');

const MAX_ATTEMPTS = 10;
const BASE_DELAY = 2000;

async function connectWithRetry() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await rabbitmq.connect();
    if (rabbitmq.isReady()) return;
    const delay = Math.min(BASE_DELAY * attempt, 15000);
    console.warn(
      `[worker] RabbitMQ not ready (attempt ${attempt}/${MAX_ATTEMPTS}) — retrying in ${delay}ms...`
    );
    await new Promise((r) => setTimeout(r, delay));
  }
  console.error(`[worker] RabbitMQ not available after ${MAX_ATTEMPTS} attempts — exiting.`);
  process.exit(1);
}

(async () => {
  try {
    global.dbConnection = await db.connect();
    console.log('[worker] DB connected.');

    await redis.connect();

    await connectWithRetry();

    await emailQueue.setupTopology();
    await emailQueue.startConsumer();

    await importQueue.setupTopology();
    await importQueue.startConsumer();

    console.log('[worker] Ready — consuming email + import queues.');

    const gracefulShutdown = async (signal) => {
      console.log(`[worker] ${signal} received, shutting down...`);
      const forceExitTimer = setTimeout(() => {
        console.error('[worker] Shutdown timeout — forcing exit.');
        process.exit(1);
      }, 10000);
      forceExitTimer.unref();
      try {
        await rabbitmq.disconnect();
        await redis.disconnect();
        if (global.dbConnection && global.dbConnection.end) await global.dbConnection.end();
      } catch (err) {
        console.error('[worker] Error during shutdown:', err);
      }
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('[worker] Fatal error:', error);
    process.exit(1);
  }
})();
