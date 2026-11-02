/**
 * restore-db.mjs — Restore MySQL dump. Dry-run by default, --confirm to execute.
 * Connection: same variables as backup-db.mjs (DATABASE_URL, or Railway's MYSQL*).
 * Usage: node scripts/restore-db.mjs <dump.sql> [--confirm] [--target <db>]
 */

import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { CONTAINER, getConnection, readDumpInfo, useContainer } from './db-connection.mjs';
import { loadEnv } from './load-env.mjs';

loadEnv();

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

async function analyzeDump(filePath) {
  const stat = fs.statSync(filePath);
  return {
    sizeKB: (stat.size / 1024).toFixed(1),
    modified: stat.mtime.toISOString().replace('T', ' ').slice(0, 19),
    ...(await readDumpInfo(filePath)),
  };
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
// stdin: a file descriptor, streamed to the client without loading the file in memory.
function mysql(conn, useDocker, args, stdin = 'ignore') {
  const clientArgs = ['-u', conn.user, '--default-character-set=utf8mb4', ...args];
  const opts = {
    stdio: [stdin, 'pipe', 'pipe'],
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
  const dump = fs.openSync(filePath, 'r');
  try {
    mysql(conn, useDocker, [database], dump);
  } finally {
    fs.closeSync(dump);
  }
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

  const conn = getConnection('restore');
  const useDocker = useContainer(conn);
  const defaultDb = conn.database;
  const database = target || defaultDb;
  const info = await analyzeDump(filePath);
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
