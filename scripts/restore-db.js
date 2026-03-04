/**
 * restore-db.js — Restore MySQL dump. Dry-run by default, --confirm to execute.
 * Usage: node scripts/restore-db.js <dump.sql> [--confirm] [--target <db>]
 */

const path = require('path');
const fs = require('fs');
const { execSync, spawnSync } = require('child_process');
const mysql = require('mysql2/promise');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) require('dotenv').config({ path: envPath });

const CONTAINER = 'web_vocab_db';

function env(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`[restore] Missing env: ${name}`);
    process.exit(1);
  }
  return v;
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

function detectContainerRunning() {
  try {
    return (
      execSync(`docker ps -q -f name=^${CONTAINER}$`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim().length > 0
    );
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

// --- Docker helpers ---

function dockerExecSql(sql, database) {
  const user = env('MYSQLUSER');
  const pass = env('MYSQL_ROOT_PASSWORD');
  const args = ['exec', '-e', `MYSQL_PWD=${pass}`, CONTAINER, 'mysql', '-u', user, '-N', '-e', sql];
  if (database) args.push(database);
  const result = spawnSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  checkResult(result);
  return result.stdout;
}

function dockerPipeSql(filePath, database) {
  const user = env('MYSQLUSER');
  const pass = env('MYSQL_ROOT_PASSWORD');
  const content = fs.readFileSync(filePath, 'utf8');
  checkResult(
    spawnSync(
      'docker',
      [
        'exec',
        '-i',
        '-e',
        `MYSQL_PWD=${pass}`,
        CONTAINER,
        'mysql',
        '-u',
        user,
        '--default-character-set=utf8mb4',
        database,
      ],
      {
        input: content,
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf8',
        maxBuffer: 100 * 1024 * 1024,
      }
    )
  );
}

// --- Direct helpers ---

function directPipeSql(filePath, database) {
  const host = env('MYSQLHOST');
  const port = process.env.MYSQLPORT || '3306';
  const user = env('MYSQLUSER');
  const pass = env('MYSQL_ROOT_PASSWORD');
  const content = fs.readFileSync(filePath, 'utf8');
  checkResult(
    spawnSync(
      'mysql',
      ['-h', host, '-P', port, '-u', user, '--default-character-set=utf8mb4', database],
      {
        input: content,
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf8',
        env: { ...process.env, MYSQL_PWD: pass },
        maxBuffer: 100 * 1024 * 1024,
      }
    )
  );
}

async function directQuery(sql, database) {
  const pool = await mysql.createPool({
    host: env('MYSQLHOST'),
    port: parseInt(process.env.MYSQLPORT || '3306', 10),
    user: env('MYSQLUSER'),
    password: env('MYSQL_ROOT_PASSWORD'),
    database: database || undefined,
    connectionLimit: 1,
  });
  try {
    const [rows] = await pool.query(sql);
    return rows;
  } finally {
    await pool.end();
  }
}

// --- High-level operations ---

async function createDbIfNeeded(useDocker, database) {
  const sql = `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`;
  if (useDocker) dockerExecSql(sql);
  else await directQuery(sql);
}

function restore(useDocker, filePath, database) {
  if (useDocker) {
    console.log(`[restore] Mode: Docker (${CONTAINER})`);
    dockerPipeSql(filePath, database);
  } else {
    console.log(`[restore] Mode: direct (${env('MYSQLHOST')}:${process.env.MYSQLPORT || '3306'})`);
    directPipeSql(filePath, database);
  }
}

async function getTablesInDb(useDocker, database) {
  if (useDocker) {
    const output = dockerExecSql('SHOW TABLES;', database);
    return output.trim().split('\n').filter(Boolean);
  }
  const rows = await directQuery('SHOW TABLES', database);
  return rows.map((r) => Object.values(r)[0]);
}

// --- Main ---

async function main() {
  const { file, confirm, target } = parseArgs();

  if (!file) {
    console.log('Usage: node scripts/restore-db.js <dump.sql> [--confirm] [--target <db>]');
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

  const useDocker = detectContainerRunning();
  const defaultDb = env('MYSQL_DATABASE');
  const database = target || defaultDb;
  const info = analyzeDump(filePath);
  const mode = useDocker ? `Docker (${CONTAINER})` : 'Direct';

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
    await createDbIfNeeded(useDocker, database);
  }

  restore(useDocker, filePath, database);
  console.log('[restore] SQL applied. Verifying...');

  const tables = await getTablesInDb(useDocker, database);
  console.log(`[restore] ${tables.length} table(s) in '${database}': ${tables.join(', ')}`);

  if (info.tables.length > 0 && tables.length >= info.tables.length)
    console.log(`[restore] OK — table count matches (${info.tables.length}).`);
  else if (info.tables.length > 0)
    console.warn(
      `[restore] WARNING: dump had ${info.tables.length} tables, DB has ${tables.length}.`
    );

  console.log('[restore] Done.');
}

main().catch((err) => {
  console.error('[restore] Fatal:', err.message);
  process.exit(1);
});
