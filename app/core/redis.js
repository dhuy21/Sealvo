/**
 * redis.js — Client Redis centralisé (node-redis, client officiel Redis).
 *
 * Connexion (même style que MySQL — host/port/password séparés) :
 *   - REDISHOST, REDISPORT, REDISPASSWORD  (recommandé ; .env.example)
 *   - REDIS_URL                            (override ; ex. Railway auto-inject)
 *   - aucune                               → pas de Redis, fallback MemoryStore
 *
 * Usage : appeler await redis.connect() au démarrage (app.js) avant getApp().
 * getClient() retourne le client connecté ou null si Redis non configuré.
 */

const { createClient } = require('redis');

let client = null;
let ready = false;

function buildConnectionUrl() {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;

  const host = process.env.REDISHOST;
  if (!host) return null;

  const port = process.env.REDISPORT || '6379';
  const password = process.env.REDISPASSWORD;
  const user = process.env.REDISUSER || 'default';

  if (password) return `redis://${user}:${encodeURIComponent(password)}@${host}:${port}`;
  return `redis://${host}:${port}`;
}

async function connect() {
  const url = buildConnectionUrl();
  if (!url) {
    console.log('[redis] No REDIS_URL or REDISHOST configured — running without Redis.');
    return;
  }

  const instance = createClient({
    url,
    socket: {
      // Stop retrying after 10 failed attempts to avoid an infinite error loop.
      reconnectStrategy: (retries) => {
        if (retries > 10) return new Error('[redis] Max reconnect attempts reached — giving up.');
        return Math.min(retries * 200, 3000);
      },
    },
  })
    .on('error', (err) => {
      ready = false;
      console.error('[redis] Error:', err.message);
    })
    .on('ready', () => {
      ready = true;
      console.log('[redis] Connected and ready.');
    })
    .on('end', () => {
      ready = false;
    });

  try {
    await instance.connect();
    client = instance;
  } catch (err) {
    console.error('[redis] Connection failed — falling back to MemoryStore:', err.message);
    // Destroy the socket to stop the error event loop from firing repeatedly.
    try {
      instance.disconnect();
    } catch {
      /* ignore */
    }
    client = null;
  }
}

function getClient() {
  return client;
}

function isReady() {
  return ready;
}

async function disconnect() {
  if (client) {
    try {
      if (ready) {
        // Redis is up: send QUIT gracefully (flushes pending commands).
        await client.quit();
      } else {
        // Redis is down or unreachable: close the socket immediately.
        // client.quit() would hang indefinitely waiting for a connection.
        client.disconnect();
      }
    } catch {
      try {
        client.disconnect();
      } catch {
        /* ignore */
      }
    }
    client = null;
    ready = false;
    console.log('[redis] Disconnected.');
  }
}

module.exports = { connect, getClient, isReady, disconnect };
