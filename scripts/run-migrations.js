/**
 * Migration runner — Phase 1 Database Management & Operations
 *
 * Runs pending SQL files from migrations/ in order. Records applied migrations
 * in schema_migrations so each file runs only once. Uses MYSQL_* from env.
 *
 * Usage: from repo root, "npm run migrate" (runs from src/); or from src/: node scripts/run-migrations.js
 */

const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');

// Load .env from src/ (when run as node scripts/run-migrations.js from src/)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

function requireEnv(name) {
  const v = process.env[name];
  if (v === undefined || v === '') {
    console.error(`[migrate] Missing env: ${name}`);
    process.exit(1);
  }
  return v;
}

async function getPool() {
  return mysql.createPool({
    host: requireEnv('MYSQLHOST'),
    port: parseInt(process.env.MYSQLPORT || '3306', 10),
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
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  return files;
}

async function getAppliedMigrations(conn) {
  try {
    const [rows] = await conn.query('SELECT name FROM schema_migrations');
    return new Set(rows.map((r) => r.name));
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return null; // table does not exist yet → run all migrations from start
    }
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
      await pool.end();
      process.exit(0);
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
      const filePath = path.join(MIGRATIONS_DIR, fileName);
      console.log(`[migrate] Running: ${fileName}`);
      await runMigrationFile(conn, filePath, fileName);
      applied.add(fileName);
      runCount += 1;
    }

    if (runCount === 0) {
      console.log('[migrate] No pending migrations.');
    } else {
      console.log(`[migrate] Applied ${runCount} migration(s).`);
    }

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('[migrate] Error:', err.message);
    await pool.end();
    process.exit(1);
  } finally {
    conn.release();
  }
}

main();
