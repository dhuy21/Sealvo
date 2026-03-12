const amqp = require('amqplib');

let connection = null;
let channel = null;
let ready = false;

function buildUrl() {
  if (process.env.RABBITMQ_URL) return process.env.RABBITMQ_URL;
  const host = process.env.RABBITMQ_HOST;
  if (!host) return null;
  const port = process.env.RABBITMQ_PORT || '5672';
  const user = process.env.RABBITMQ_USER || 'guest';
  const pass = process.env.RABBITMQ_PASS || 'guest';
  return `amqp://${user}:${pass}@${host}:${port}`;
}

async function connect() {
  const url = buildUrl();
  if (!url) {
    console.warn('[rabbitmq] No RABBITMQ_HOST or RABBITMQ_URL — skipping.');
    return;
  }

  try {
    connection = await amqp.connect(url);
    connection.on('error', (err) => {
      console.error('[rabbitmq] Connection error:', err.message);
      ready = false;
    });
    connection.on('close', () => {
      ready = false;
      connection = null;
      channel = null;
    });

    channel = await connection.createConfirmChannel();
    channel.prefetch(1);
    channel.on('error', (err) => {
      console.error('[rabbitmq] Channel error:', err.message);
    });
    channel.on('close', () => {
      channel = null;
      ready = false;
    });

    ready = true;
    console.log('[rabbitmq] Connected.');
  } catch (err) {
    console.error('[rabbitmq] Failed to connect:', err.message);
    ready = false;
  }
}

function getChannel() {
  return channel;
}

function isReady() {
  return ready;
}

async function disconnect() {
  ready = false;
  try {
    if (channel) await channel.close();
  } catch {
    /* already closed */
  }
  try {
    if (connection) await connection.close();
  } catch {
    /* already closed */
  }
  channel = null;
  connection = null;
}

module.exports = { connect, getChannel, isReady, disconnect };
