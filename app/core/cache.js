const { getClient, isReady } = require('./redis');

const PREFIX = 'cache:';

async function get(key) {
  if (!isReady()) return null;
  try {
    const raw = await getClient().get(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function set(key, value, ttlSeconds) {
  if (!isReady()) return false;
  try {
    await getClient().set(PREFIX + key, JSON.stringify(value), { EX: ttlSeconds });
    return true;
  } catch {
    return false;
  }
}

/**
 * Atomic "set if not exists" with TTL — used for idempotence / dedup.
 * Returns true if the key was set (first time), false if it already existed or Redis is down.
 */
async function setNX(key, value, ttlSeconds) {
  if (!isReady()) return false;
  try {
    const result = await getClient().set(PREFIX + key, JSON.stringify(value), {
      EX: ttlSeconds,
      NX: true,
    });
    return result === 'OK';
  } catch {
    return false;
  }
}

async function del(keys) {
  if (!isReady()) return false;
  try {
    const list = Array.isArray(keys) ? keys : [keys];
    const prefixed = list.map((k) => PREFIX + k);
    await getClient().del(prefixed);
    return true;
  } catch {
    return false;
  }
}

async function invalidatePattern(pattern) {
  if (!isReady()) return false;
  try {
    const client = getClient();
    let cursor = 0;
    do {
      const result = await client.scan(cursor, { MATCH: PREFIX + pattern, COUNT: 100 });
      cursor = result.cursor;
      if (result.keys.length > 0) {
        await client.del(result.keys);
      }
    } while (cursor !== 0);
    return true;
  } catch {
    return false;
  }
}

module.exports = { get, set, setNX, del, invalidatePattern };
