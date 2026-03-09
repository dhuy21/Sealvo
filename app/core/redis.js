const { createClient } = require('redis');

let client = null;
let ready = false;

function buildConnectionUrl() {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;

  const host = process.env.REDISHOST;
  if (!host) return null;

  const port = process.env.REDISPORT || '6379';
  const password = process.env.REDIS_PASSWORD;
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
      reconnectStrategy: (retries) => {
        if (retries > 30) return new Error('[redis] Max reconnect attempts reached — giving up.');
        return Math.min(retries * 500, 10000);
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
      client = null;
    });

  try {
    await instance.connect();
    client = instance;
  } catch (err) {
    console.error('[redis] Connection failed — falling back to MemoryStore:', err.message);
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
        await client.quit();
      } else {
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
