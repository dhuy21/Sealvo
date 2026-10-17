/**
 * restore-db.mjs — Restore MySQL dump. Dry-run by default, --confirm to execute.
 * Connection: same variables as backup-db.mjs (DATABASE_URL, or legacy MYSQL*).
 * Usage: node scripts/restore-db.mjs <dump.sql> [--confirm] [--target <db>]
 */

import path from 'node:path';
import fs from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';
import { loadEnv } from './load-env.mjs';

loadEnv();

const CONTAINER = 'sealvo_db';

function env(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`[restore] Missing env: ${name}`);
    process.exit(1);
  }
  return v;
}

function getConnection() {
  if (!process.env.DATABASE_URL && process.env.MYSQLHOST) {
    return {
      host: env('MYSQLHOST'),
      port: process.env.MYSQLPORT || '3306',
      user: env('MYSQLUSER'),
      password: env('MYSQL_ROOT_PASSWORD'),
      database: env('MYSQL_DATABASE'),
    };
  }
  const url = new URL(env('DATABASE_URL'));
  return {
    host: url.hostname,
    port: url.port || '3306',
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
  };
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { file: null, confirm: false, target: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--confirm') result.confirm = true;
    else if (args[i] === '--target' && args[i + 1]) result.target = args[++i];
    else if (!args[i].startsWith('--')) result.file = args[i];
  }
  return result;
}

function analyzeDump(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const stat = fs.statSync(filePath);
  const tables = [...content.matchAll(/CREATE TABLE.*?`(\w+)`/gi)].map((m) => m[1]);
  return {
    sizeKB: (stat.size / 1024).toFixed(1),
    modified: stat.mtime.toISOString().replace('T', ' ').slice(0, 19),
    tables,
    inserts: (content.match(/INSERT INTO/gi) || []).length,
    drops: (content.match(/DROP TABLE/gi) || []).length,
  };
}

// Only when DATABASE_URL targets the container's published port: otherwise a running
// dev container would silently replace the server the URL points at.
function useContainer({ host, port }) {
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

function checkResult(result) {
  if (result.error) {
    console.error('[restore] Error:', result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    const stderr = (result.stderr || '').replace(/.*\[Warning\].*\n?/g, '').trim();
    console.error('[restore] mysql failed (exit', result.status + ')', stderr || '(warnings only)');
    process.exit(1);
  }
}

// Runs the mysql client inside the dev container (Docker mode) or on this machine (direct).
function mysql(conn, useDocker, args, input) {
  const clientArgs = ['-u', conn.user, '--default-character-set=utf8mb4', ...args];
  const opts = {
    input,
    stdio: ['pipe', 'pipe', 'pipe'],
    encoding: 'utf8',
    maxBuffer: 100 * 1024 * 1024,
  };
  const result = useDocker
    ? spawnSync(
        'docker',
        ['exec', '-i', '-e', `MYSQL_PWD=${conn.password}`, CONTAINER, 'mysql', ...clientArgs],
        opts,
      )
    : spawnSync('mysql', ['-h', conn.host, '-P', conn.port, ...clientArgs], {
        ...opts,
        env: { ...process.env, MYSQL_PWD: conn.password },
      });
  checkResult(result);
  return result.stdout;
}

// --- High-level operations ---

function createDbIfNeeded(conn, useDocker, database) {
  const sql = `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`;
  mysql(conn, useDocker, ['-e', sql]);
}

function restore(conn, useDocker, filePath, database) {
  console.log(
    `[restore] Mode: ${useDocker ? `Docker (${CONTAINER})` : `direct (${conn.host}:${conn.port})`}`,
  );
  mysql(conn, useDocker, [database], fs.readFileSync(filePath, 'utf8'));
}

function getTablesInDb(conn, useDocker, database) {
  return mysql(conn, useDocker, ['-N', '-e', 'SHOW TABLES;', database])
    .trim()
    .split('\n')
    .filter(Boolean);
}

// --- Main ---

async function main() {
  const { file, confirm, target } = parseArgs();

  if (!file) {
    console.log('Usage: node scripts/restore-db.mjs <dump.sql> [--confirm] [--target <db>]');
    process.exit(0);
  }

  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) {
    console.error(`[restore] Not found: ${filePath}`);
    process.exit(1);
  }
  if (!filePath.endsWith('.sql')) {
    console.error('[restore] File must be .sql');
    process.exit(1);
  }

  const conn = getConnection();
  const useDocker = useContainer(conn);
  const defaultDb = conn.database;
  const database = target || defaultDb;
  const info = analyzeDump(filePath);
  const mode = useDocker ? `Docker (${CONTAINER})` : `Direct (${conn.host}:${conn.port})`;

  console.log('\n=== Database Restore ===\n');
  console.log(`  File:     ${path.basename(filePath)} (${info.sizeKB} KB, ${info.modified})`);
  console.log(`  Tables:   ${info.tables.length} (${info.tables.join(', ')})`);
  console.log(`  INSERTs:  ${info.inserts} | DROP TABLE: ${info.drops}`);
  console.log(`  Target:   ${database}${target ? ' (custom)' : ''} | Mode: ${mode}`);

  if (process.env.NODE_ENV === 'production' && database === defaultDb)
    console.log('\n  *** WARNING: NODE_ENV=production — restoring into MAIN database! ***');

  if (!confirm) {
    console.log('\n  DRY RUN — add --confirm to execute.\n');
    process.exit(0);
  }

  console.log('\n[restore] Starting...');
  if (target && target !== defaultDb) {
    console.log(`[restore] Creating '${database}' if not exists...`);
    createDbIfNeeded(conn, useDocker, database);
  }

  restore(conn, useDocker, filePath, database);
  console.log('[restore] SQL applied. Verifying...');

  const tables = getTablesInDb(conn, useDocker, database);
  console.log(`[restore] ${tables.length} table(s) in '${database}': ${tables.join(', ')}`);

  if (info.tables.length > 0 && tables.length >= info.tables.length)
    console.log(`[restore] OK — table count matches (${info.tables.length}).`);
  else if (info.tables.length > 0)
    console.warn(
      `[restore] WARNING: dump had ${info.tables.length} tables, DB has ${tables.length}.`,
    );

  console.log('[restore] Done.');
}

main().catch((err) => {
  console.error('[restore] Fatal:', err.message);
  process.exit(1);
});
