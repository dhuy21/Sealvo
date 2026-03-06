/**
 * cache.js — Cache-Aside wrapper over the centralized Redis client.
 *
 * Every operation degrades gracefully: if Redis is down the call returns
 * null / false and the caller falls through to the database.
 *
 * Key convention:
 *   cache:dashboard:<userId>        – per-user dashboard stats
 *   cache:pkgs:user:<userId>        – per-user packages list
 *   cache:pkgs:shared               – community packages (public + protected)
 *   cache:lb:<gameType>             – leaderboard per game type
 *   cache:gamestats:<userId>        – per-user game stats
 *   cache:tts:voices:<lang>         – Wavenet voice list per language (6h)
 *   cache:tts:audio:<lang>:<hash>   – generated MP3 audio as base64 (24h)
 */

const { getClient, isReady } = require('./redis');

const PREFIX = 'cache:';

/**
 * GET a cached value. Returns the parsed object, or null on miss / error.
 */
async function get(key) {
  if (!isReady()) return null;
  try {
    const raw = await getClient().get(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * SET a value with a TTL (seconds). Returns true on success, false otherwise.
 */
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
 * DEL one or more exact keys. Accepts a string or an array.
 */
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

/**
 * Delete all keys matching a pattern (e.g. "dashboard:*").
 * Uses SCAN (non-blocking) instead of KEYS (blocks Redis).
 */
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

module.exports = { get, set, del, invalidatePattern };
