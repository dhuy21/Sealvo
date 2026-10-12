const crypto = require('crypto');
const { getClient, isReady } = require('./redis');

const PREFIX = 'job:';
const CHANNEL_PREFIX = 'job-events:';
const USER_JOBS_PREFIX = 'user-jobs:';
const DEFAULT_TTL = 3600;

function generateId() {
  return crypto.randomUUID();
}

async function create(type, meta = {}) {
  if (!isReady()) return null;
  const id = generateId();
  const job = {
    id,
    type,
    status: 'pending',
    progress: null,
    result: null,
    error: null,
    meta,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  try {
    const client = getClient();
    await client.set(PREFIX + id, JSON.stringify(job), { EX: DEFAULT_TTL });
    if (meta.userId) {
      await client.sAdd(USER_JOBS_PREFIX + meta.userId, id);
      await client.expire(USER_JOBS_PREFIX + meta.userId, DEFAULT_TTL);
    }
    await client.publish(CHANNEL_PREFIX + id, JSON.stringify(job));
    return job;
  } catch {
    return null;
  }
}

async function get(id) {
  if (!isReady()) return null;
  try {
    const raw = await getClient().get(PREFIX + id);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function update(id, fields) {
  if (!isReady()) return false;
  try {
    const client = getClient();
    const raw = await client.get(PREFIX + id);
    if (!raw) return false;
    const job = JSON.parse(raw);
    Object.assign(job, fields, { updatedAt: Date.now() });
    const ttl = await client.ttl(PREFIX + id);
    const serialized = JSON.stringify(job);
    await client.set(PREFIX + id, serialized, { EX: ttl > 0 ? ttl : DEFAULT_TTL });
    client.publish(CHANNEL_PREFIX + id, serialized).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

async function remove(id) {
  if (!isReady()) return false;
  try {
    const client = getClient();
    const raw = await client.get(PREFIX + id);
    if (raw) {
      const job = JSON.parse(raw);
      if (job.meta?.userId) {
        await client.sRem(USER_JOBS_PREFIX + job.meta.userId, id);
      }
    }
    await client.del(PREFIX + id);
    return true;
  } catch {
    return false;
  }
}

async function getActiveByUser(userId) {
  if (!isReady() || !userId) return [];
  try {
    const client = getClient();
    const ids = await client.sMembers(USER_JOBS_PREFIX + userId);
    if (!ids || ids.length === 0) return [];
    const jobs = [];
    for (const id of ids) {
      const job = await get(id);
      if (job && job.status !== 'completed' && job.status !== 'failed') {
        jobs.push(job);
      } else {
        client.sRem(USER_JOBS_PREFIX + userId, id).catch(() => {});
      }
    }
    return jobs;
  } catch {
    return [];
  }
}

module.exports = { create, get, update, remove, getActiveByUser, CHANNEL_PREFIX };
