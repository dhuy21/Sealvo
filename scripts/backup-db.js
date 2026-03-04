/**
 * backup-db.js — MySQL dump (schema + data), auto-verify, retention.
 *
 * Modes:
 *   Docker — uses container "web_vocab_db" if running.
 *   Direct — uses mysqldump on host (default on Railway / CI).
 *
 * S3 upload (optional):
 *   When S3-compatible bucket vars are present, the dump is uploaded then
 *   a retention policy is applied inside the bucket.
 *
 *   Supported variable naming (checked in order):
 *     Railway "AWS SDK Generic" → AWS_S3_BUCKET_NAME, AWS_ENDPOINT_URL, …
 *     Railway raw reference     → BUCKET_NAME, BUCKET_ENDPOINT, …
 *
 * Usage: npm run backup:db
 */

const path = require('path');
const fs = require('fs');
const net = require('net');
const { execSync, spawnSync } = require('child_process');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) require('dotenv').config({ path: envPath });

const BACKUPS_DIR = path.join(__dirname, '..', 'backups');
const CONTAINER = 'web_vocab_db';
const RETENTION = parseInt(process.env.BACKUP_RETENTION, 10) || 7;
const BUCKET_PREFIX = 'backups';

function getDumpFlags(useDocker) {
  const flags = ['--single-transaction', '--routines', '--triggers'];
  // --set-gtid-purged is MySQL-only; MariaDB's mysqldump (installed by
  // default-mysql-client on Debian) does not support it and will crash.
  try {
    const cmd = useDocker
      ? `docker exec ${CONTAINER} mysqldump --help 2>&1`
      : 'mysqldump --help 2>&1';
    const help = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    if (help.includes('set-gtid-purged')) flags.push('--set-gtid-purged=OFF');
  } catch {
    /* binary missing or MariaDB — skip the flag */
  }
  return flags;
}

/* ── helpers ─────────────────────────────────────────────── */

function env(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`[backup] Missing env: ${name}`);
    process.exit(1);
  }
  return v;
}

function pick(...names) {
  for (const n of names) {
    if (process.env[n]) return process.env[n];
  }
  return undefined;
}

function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/* ── S3 bucket config resolution ─────────────────────────── */

function getBucketConfig() {
  const bucket = pick('AWS_S3_BUCKET_NAME', 'BUCKET_NAME', 'BUCKET');
  const endpoint = pick('AWS_ENDPOINT_URL', 'BUCKET_ENDPOINT', 'ENDPOINT');
  if (!bucket || !endpoint) return null;

  const accessKeyId = pick('AWS_ACCESS_KEY_ID', 'ACCESS_KEY_ID');
  const secretAccessKey = pick('AWS_SECRET_ACCESS_KEY', 'SECRET_ACCESS_KEY');
  if (!accessKeyId || !secretAccessKey) return null;

  const region = pick('AWS_DEFAULT_REGION', 'REGION') || 'auto';
  return { bucket, endpoint: endpoint.replace(/\/$/, ''), region, accessKeyId, secretAccessKey };
}

function makeS3Client(cfg) {
  const { S3Client } = require('@aws-sdk/client-s3');
  return new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    forcePathStyle: false,
  });
}

/* ── wait for MySQL (handles Serverless cold boot) ────────── */

const WAIT_MAX_MS = parseInt(process.env.MYSQL_WAIT_TIMEOUT, 10) || 30000;
const WAIT_INTERVAL_MS = 2000;

function waitForMySQL(host, port) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + WAIT_MAX_MS;
    let attempt = 0;

    function tryConnect() {
      attempt++;
      const sock = new net.Socket();
      sock.setTimeout(WAIT_INTERVAL_MS);

      sock.once('connect', () => {
        sock.destroy();
        resolve(attempt);
      });
      sock.once('error', () => {
        sock.destroy();
        if (Date.now() >= deadline)
          return reject(new Error(`MySQL not reachable after ${WAIT_MAX_MS / 1000}s`));
        setTimeout(tryConnect, WAIT_INTERVAL_MS);
      });
      sock.once('timeout', () => {
        sock.destroy();
        if (Date.now() >= deadline)
          return reject(new Error(`MySQL not reachable after ${WAIT_MAX_MS / 1000}s`));
        setTimeout(tryConnect, WAIT_INTERVAL_MS);
      });

      sock.connect(parseInt(port, 10), host);
    }

    tryConnect();
  });
}

/* ── dump ─────────────────────────────────────────────────── */

function containerRunning() {
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

function backup(outPath) {
  const user = env('MYSQLUSER');
  const pass = env('MYSQL_ROOT_PASSWORD');
  const db = env('MYSQL_DATABASE');
  const useDocker = containerRunning();
  const flags = getDumpFlags(useDocker);
  const spawnOpts = { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' };
  let result;

  console.log(`[backup] Dump flags: ${flags.join(' ')}`);

  if (useDocker) {
    console.log(`[backup] Using Docker container ${CONTAINER}`);
    result = spawnSync(
      'docker',
      ['exec', '-e', `MYSQL_PWD=${pass}`, CONTAINER, 'mysqldump', '-u', user, ...flags, db],
      spawnOpts
    );
  } else {
    const host = env('MYSQLHOST');
    const port = process.env.MYSQLPORT || '3306';
    console.log(`[backup] Using direct connection (${host}:${port})`);
    result = spawnSync('mysqldump', ['-h', host, '-P', port, '-u', user, ...flags, db], {
      ...spawnOpts,
      env: { ...process.env, MYSQL_PWD: pass },
    });
  }

  if (result.error) {
    console.error('[backup] Error:', result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error('[backup] mysqldump failed:', result.stderr);
    process.exit(1);
  }
  fs.writeFileSync(outPath, result.stdout, 'utf8');
}

/* ── verify ───────────────────────────────────────────────── */

function verify(filePath) {
  const tables = [...fs.readFileSync(filePath, 'utf8').matchAll(/CREATE TABLE.*?`(\w+)`/gi)].map(
    (m) => m[1]
  );
  if (!tables.length) {
    console.error('[backup] FAILED: no CREATE TABLE in dump.');
    process.exit(1);
  }
  console.log(`[backup] Verified: ${tables.length} table(s) (${tables.join(', ')})`);
}

/* ── local retention ──────────────────────────────────────── */

function applyRetention(db) {
  const pattern = new RegExp(`^${db}_\\d{8}_\\d{6}\\.sql$`);
  const files = fs
    .readdirSync(BACKUPS_DIR)
    .filter((f) => pattern.test(f))
    .map((f) => ({ name: f, mtime: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime() }))
    .sort((a, b) => b.mtime - a.mtime);

  files.slice(RETENTION).forEach((f) => {
    fs.unlinkSync(path.join(BACKUPS_DIR, f.name));
    console.log('[backup] Removed old:', f.name);
  });
}

/* ── bucket upload + retention ────────────────────────────── */

async function uploadToBucket(client, cfg, localPath, key) {
  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  const body = fs.readFileSync(localPath);
  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: body,
      ContentType: 'application/sql',
    })
  );
  console.log(`[backup] Uploaded to bucket: ${key} (${(body.length / 1024).toFixed(1)} KB)`);
}

async function applyRetentionInBucket(client, cfg, db) {
  const { ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
  const prefix = `${BUCKET_PREFIX}/${db}_`;
  const list = await client.send(new ListObjectsV2Command({ Bucket: cfg.bucket, Prefix: prefix }));
  const objects = (list.Contents || [])
    .filter((o) => o.Key && /\.sql$/.test(o.Key))
    .sort((a, b) => (b.LastModified || 0) - (a.LastModified || 0));

  for (let i = RETENTION; i < objects.length; i++) {
    await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: objects[i].Key }));
    console.log('[backup] Removed from bucket:', objects[i].Key);
  }
  console.log(
    `[backup] Bucket retention: keeping ${Math.min(objects.length, RETENTION)}/${objects.length} dumps`
  );
}

/* ── main ─────────────────────────────────────────────────── */

async function main() {
  const db = env('MYSQL_DATABASE');
  const outPath = path.join(BACKUPS_DIR, `${db}_${timestamp()}.sql`);

  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

  console.log('[backup] Starting...');

  if (!containerRunning()) {
    const host = env('MYSQLHOST');
    const port = process.env.MYSQLPORT || '3306';
    console.log(`[backup] Waiting for MySQL (${host}:${port})...`);
    const attempts = await waitForMySQL(host, port);
    console.log(`[backup] MySQL ready (${attempts} attempt${attempts > 1 ? 's' : ''})`);
  }

  backup(outPath);

  const sizeKB = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`[backup] Written: ${outPath} (${sizeKB} KB)`);

  verify(outPath);
  applyRetention(db);

  const bucketCfg = getBucketConfig();
  if (bucketCfg) {
    console.log(`[backup] Bucket detected (${bucketCfg.endpoint}), uploading...`);
    const client = makeS3Client(bucketCfg);
    const key = `${BUCKET_PREFIX}/${path.basename(outPath)}`;
    await uploadToBucket(client, bucketCfg, outPath, key);
    await applyRetentionInBucket(client, bucketCfg, db);
  } else {
    console.log('[backup] No bucket config found, skipping upload.');
  }

  console.log('[backup] Done.');
}

main().catch((err) => {
  console.error('[backup] Fatal:', err.message);
  process.exit(1);
});
