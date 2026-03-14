const crypto = require('crypto');
const rabbitmq = require('../core/rabbitmq');
const cache = require('../core/cache');
const { isReady: redisReady } = require('../core/redis');
const MailersendService = require('../services/mailersend');

const EXCHANGE = 'email.direct';
const RETRY_EXCHANGE = 'email.retry.direct';
const QUEUE = 'email.send';
const RETRY_QUEUE = 'email.retry';
const FAILED_QUEUE = 'email.failed';
const ROUTING_KEY = 'email';
const RETRY_TTL = 10_000;
const MAX_RETRIES = 2;
const DEDUP_TTL = 86_400;

async function setupTopology() {
  const ch = rabbitmq.getChannel();
  if (!ch) throw new Error('Channel not available');

  await ch.assertExchange(EXCHANGE, 'direct', { durable: true });
  await ch.assertExchange(RETRY_EXCHANGE, 'direct', { durable: true });

  await ch.assertQueue(QUEUE, {
    durable: true,
    arguments: { 'x-dead-letter-exchange': RETRY_EXCHANGE },
  });

  await ch.assertQueue(RETRY_QUEUE, {
    durable: true,
    arguments: {
      'x-message-ttl': RETRY_TTL,
      'x-dead-letter-exchange': EXCHANGE,
    },
  });

  await ch.assertQueue(FAILED_QUEUE, { durable: true });

  await ch.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);
  await ch.bindQueue(RETRY_QUEUE, RETRY_EXCHANGE, ROUTING_KEY);

  console.log('[emailQueue] Topology ready.');
}

function publish(payload) {
  const ch = rabbitmq.getChannel();
  if (!ch) return false;

  ch.publish(EXCHANGE, ROUTING_KEY, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
    contentType: 'application/json',
    messageId: crypto.randomUUID(),
  });
  return true;
}

async function enqueue(payload) {
  const ch = rabbitmq.getChannel();
  if (ch) return publish(payload);

  const result = await MailersendService.sendEmail(payload.to, payload.content, payload.subject);
  return result || false;
}

function getRetryCount(msg) {
  const deaths = msg.properties?.headers?.['x-death'];
  if (!Array.isArray(deaths)) return 0;
  const entry = deaths.find((d) => d.queue === QUEUE && d.reason === 'rejected');
  return entry?.count || 0;
}

async function startConsumer() {
  const ch = rabbitmq.getChannel();

  await ch.consume(QUEUE, async (msg) => {
    if (!msg) return;

    const dedupId = msg.properties.messageId;
    if (dedupId && redisReady()) {
      const isNew = await cache.setNX(`email:dedup:${dedupId}`, 1, DEDUP_TTL);
      if (!isNew) {
        console.warn(`[emailQueue] Duplicate detected (${dedupId}) — skipping.`);
        return ch.ack(msg);
      }
    }

    let payload;
    try {
      payload = JSON.parse(msg.content.toString());
    } catch {
      console.warn('[emailQueue] Discarding message with invalid JSON.');
      return ch.ack(msg);
    }

    try {
      const result = await MailersendService.sendEmail(
        payload.to,
        payload.content,
        payload.subject
      );
      if (!result) throw new Error('sendEmail returned falsy');
      try {
        ch.ack(msg);
      } catch (ackErr) {
        console.error('[emailQueue] Ack failed for sent email:', ackErr.message);
        return;
      }
    } catch (err) {
      try {
        const retries = getRetryCount(msg);
        if (retries >= MAX_RETRIES) {
          console.error(
            `[emailQueue] Giving up after ${retries} retries — moving to ${FAILED_QUEUE}:`,
            err.message
          );
          ch.sendToQueue(FAILED_QUEUE, msg.content, { persistent: true });
          ch.ack(msg);
        } else {
          console.warn(
            `[emailQueue] Send failed (retry ${retries + 1}/${MAX_RETRIES}):`,
            err.message
          );
          ch.nack(msg, false, false);
        }
      } catch (channelErr) {
        console.error('[emailQueue] Channel error during error handling:', channelErr.message);
      }
    }
  });

  console.log('[emailQueue] Consumer started — waiting for email jobs.');
}

module.exports = { setupTopology, publish, enqueue, startConsumer };
