const rabbitmq = require('../core/rabbitmq');
const jobTracker = require('../core/jobTracker');
const { processWords } = require('../services/wordProcessingService');
const xlsx = require('xlsx');

const EXCHANGE = 'import.direct';
const RETRY_EXCHANGE = 'import.retry.direct';
const QUEUE = 'import.process';
const RETRY_QUEUE = 'import.retry';
const FAILED_QUEUE = 'import.failed';
const ROUTING_KEY = 'import';
const RETRY_TTL = 30_000;
const MAX_RETRIES = 1;

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

  console.log('[importQueue] Topology ready.');
}

function publish(payload) {
  const ch = rabbitmq.getChannel();
  if (!ch) return false;

  ch.publish(EXCHANGE, ROUTING_KEY, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
    contentType: 'application/json',
  });
  return true;
}

function parseExcelFile(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

  if (!data.length) return [];

  const startRow = data[0][0] === 'Mot' || data[0][0] === 'Word' ? 1 : 0;

  const words = [];
  for (let i = startRow; i < data.length; i++) {
    const row = data[i];
    if (!row || row[0] == null || String(row[0]).trim() === '') continue;

    words.push({
      id: i,
      word: String(row[0]).trim(),
      language_code: row[1]
        ? String(row[1])
            .replace(/\([^)]*\)/g, '')
            .trim()
        : '',
      subject: row[2] ? String(row[2]).trim() : '',
      type: row[3] ? String(row[3]).trim() : '',
      pronunciation: row[4] ? String(row[4]).trim() : '',
      meaning: row[5] ? String(row[5]).trim() : '',
      example: row[6] ? String(row[6]).trim() : '',
      synonyms: row[7] ? String(row[7]).trim() : '',
      antonyms: row[8] ? String(row[8]).trim() : '',
      grammar: row[9] ? String(row[9]).trim() : '',
      level: row[10] != null ? String(row[10]).trim() : '',
    });
  }

  return words;
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

    let payload;
    try {
      payload = JSON.parse(msg.content.toString());
    } catch {
      console.warn('[importQueue] Discarding message with invalid JSON.');
      return ch.ack(msg);
    }

    const { jobId, wordsData, packageId, userId } = payload;

    try {
      await jobTracker.update(jobId, {
        status: 'processing',
        progress: { current: 0, total: 0, phase: 'parsing' },
      });

      const total = wordsData.length;

      const { successCount, errChamps } = await processWords(wordsData, packageId, userId, {
        onPhase: async (phase, current, t) => {
          await jobTracker.update(jobId, { progress: { current, total: t || total, phase } });
        },
        onProgress: async (current, t) => {
          const step = Math.max(1, Math.floor(t / 20));
          if (current % step === 0 || current === t) {
            await jobTracker.update(jobId, { progress: { current, total: t, phase: 'saving' } });
          }
        },
      });

      await jobTracker.update(jobId, {
        status: 'completed',
        progress: { current: total, total, phase: 'done' },
        result: { imported: successCount, errors: errChamps, total },
      });

      try {
        ch.ack(msg);
      } catch (ackErr) {
        console.error(`[importQueue] Ack failed for completed job ${jobId}:`, ackErr.message);
        return;
      }
      console.log(
        `[importQueue] Job ${jobId} completed: ${successCount} imported, ${errChamps} errors.`
      );
    } catch (err) {
      console.error(`[importQueue] Job ${jobId} failed:`, err.message);

      try {
        const retries = getRetryCount(msg);
        if (retries >= MAX_RETRIES) {
          await jobTracker.update(jobId, { status: 'failed', error: err.message });
          ch.sendToQueue(FAILED_QUEUE, msg.content, { persistent: true });
          ch.ack(msg);
        } else {
          await jobTracker.update(jobId, { status: 'retrying', error: err.message });
          ch.nack(msg, false, false);
        }
      } catch (channelErr) {
        console.error(
          `[importQueue] Channel error during error handling for job ${jobId}:`,
          channelErr.message
        );
        await jobTracker.update(jobId, { status: 'failed', error: err.message }).catch(() => {});
      }
    }
  });

  console.log('[importQueue] Consumer started — waiting for import jobs.');
}

module.exports = { setupTopology, publish, startConsumer, parseExcelFile };
