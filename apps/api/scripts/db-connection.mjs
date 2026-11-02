import fs from 'node:fs';
import readline from 'node:readline';
import { execSync } from 'node:child_process';

export const CONTAINER = 'sealvo_db';

function required(tag, ...names) {
  for (const name of names) if (process.env[name]) return process.env[name];
  console.error(`[${tag}] Missing env: ${names.join(' or ')}`);
  process.exit(1);
}

/**
 * DATABASE_URL (mysql://user:pass@host:port/db), or Railway's MySQL variables
 * (MYSQLHOST, MYSQLPORT, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE).
 */
export function getConnection(tag) {
  if (!process.env.DATABASE_URL && process.env.MYSQLHOST) {
    return {
      host: process.env.MYSQLHOST,
      port: process.env.MYSQLPORT || '3306',
      user: required(tag, 'MYSQLUSER'),
      // MYSQL_ROOT_PASSWORD only goes with MYSQLUSER=root
      password: required(tag, 'MYSQLPASSWORD', 'MYSQL_ROOT_PASSWORD'),
      database: required(tag, 'MYSQLDATABASE', 'MYSQL_DATABASE'),
    };
  }
  const url = new URL(required(tag, 'DATABASE_URL'));
  return {
    host: url.hostname,
    port: url.port || '3306',
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
  };
}

// Only when DATABASE_URL targets the container's published port: otherwise a running
// dev container would silently replace the server the URL points at.
export function useContainer({ host, port }) {
  if (host !== 'localhost' && host !== '127.0.0.1') return false;
  try {
    return execSync(`docker port ${CONTAINER} 3306`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .split('\n')
      .some((line) => line.trim().endsWith(`:${port}`));
  } catch {
    return false;
  }
}

/** Tables and statement counts of a dump, read line by line (a dump can exceed a string's size) */
export async function readDumpInfo(filePath) {
  const info = { tables: [], inserts: 0, drops: 0 };
  const lines = readline.createInterface({ input: fs.createReadStream(filePath, 'utf8') });
  for await (const line of lines) {
    const table = /^CREATE TABLE `(\w+)`/.exec(line);
    if (table) info.tables.push(table[1]);
    else if (line.startsWith('INSERT INTO')) info.inserts++;
    else if (line.startsWith('DROP TABLE')) info.drops++;
  }
  return info;
}
