/**
 * run-migrations.js — Run pending SQL migrations in order, track in schema_migrations.
 * Auto-detects: inside Docker container, host with Docker running, or direct connection.
 * Usage: npm run migrate
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const mysql = require('mysql2/promise');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) require('dotenv').config({ path: envPath });

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const CONTAINER = 'web_vocab_db';

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`[migrate] Missing env: ${name}`);
    process.exit(1);
  }
  return v;
}

function isInsideDocker() {
  return fs.existsSync('/.dockerenv');
}

function containerRunning() {
  try {
    return execSync(`docker ps -q -f name=^${CONTAINER}$`, { encoding: 'utf8' }).trim().length > 0;
  } catch {
    return false;
  }
}

function getConnectionConfig() {
  // Case 1: inside Docker container — use env vars as-is (Docker DNS resolves service names)
  if (isInsideDocker()) {
    return { host: requireEnv('MYSQLHOST'), port: parseInt(process.env.MYSQLPORT || '3306', 10) };
  }

  // Case 2: on host, Docker container running — use localhost + exposed port
  if (containerRunning()) {
    const port = parseInt(process.env.MYSQLHOST_PORT || process.env.MYSQLPORT || '3307', 10);
    console.log(`[migrate] Detected Docker container ${CONTAINER} — using 127.0.0.1:${port}`);
    return { host: '127.0.0.1', port };
  }

  // Case 3: direct mode (production, Railway, no Docker)
  return { host: requireEnv('MYSQLHOST'), port: parseInt(process.env.MYSQLPORT || '3306', 10) };
}

async function getPool() {
  const { host, port } = getConnectionConfig();
  return mysql.createPool({
    host,
    port,
    user: requireEnv('MYSQLUSER'),
    password: requireEnv('MYSQL_ROOT_PASSWORD'),
    database: requireEnv('MYSQL_DATABASE'),
    multipleStatements: true,
    connectionLimit: 1,
  });
}

function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error('[migrate] migrations/ directory not found.');
    process.exit(1);
  }
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

async function getAppliedMigrations(conn) {
  try {
    const [rows] = await conn.query('SELECT name FROM schema_migrations');
    return new Set(rows.map((r) => r.name));
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') return null;
    throw err;
  }
}

async function runMigrationFile(conn, filePath, fileName) {
  const sql = fs.readFileSync(filePath, 'utf8');
  await conn.query(sql);
  await conn.query('INSERT INTO schema_migrations (name) VALUES (?)', [fileName]);
}

async function main() {
  console.log('[migrate] Connecting to database...');
  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const files = getMigrationFiles();
    if (files.length === 0) {
      console.log('[migrate] No .sql files in migrations/.');
      return;
    }

    let applied = await getAppliedMigrations(conn);
    if (applied === null) {
      console.log(
        '[migrate] schema_migrations not found; will run all migrations (first run will create it).'
      );
      applied = new Set();
    }

    let runCount = 0;
    for (const fileName of files) {
      if (applied.has(fileName)) {
        console.log(`[migrate] Skip (already applied): ${fileName}`);
        continue;
      }
      console.log(`[migrate] Running: ${fileName}`);
      await runMigrationFile(conn, path.join(MIGRATIONS_DIR, fileName), fileName);
      runCount++;
    }

    console.log(
      runCount === 0
        ? '[migrate] No pending migrations.'
        : `[migrate] Applied ${runCount} migration(s).`
    );
  } catch (err) {
    console.error('[migrate] Error:', err.message);
    process.exitCode = 1;
  } finally {
    conn.release();
    await pool.end();
  }
}

main();
