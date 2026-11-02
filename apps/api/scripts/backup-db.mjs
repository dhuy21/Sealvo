/**
 * backup-db.mjs — MySQL dump (schema + data), auto-verify, retention.
 *
 * Connection: DATABASE_URL (mysql://user:pass@host:port/db), or Railway's
 * MYSQLHOST / MYSQLPORT / MYSQLUSER / MYSQLPASSWORD / MYSQLDATABASE.
 *
 * Modes:
 *   Docker — uses the dev container "sealvo_db" when DATABASE_URL points at its
 *            published port (no mysqldump needed on the host).
 *   Direct — uses mysqldump on the host (default on Railway / CI / Docker image).
 *
 * S3 upload (optional):
 *   When S3-compatible bucket vars are present, the dump is uploaded then
 *   a retention policy is applied inside the bucket.
 *
 *   Supported variable naming (checked in order; the credentials always come from the same set
 *   as the bucket name, so the SES AWS_* keys are never sent to a Railway bucket):
 *     Railway "AWS SDK Generic" → AWS_S3_BUCKET_NAME, AWS_ENDPOINT_URL, AWS_ACCESS_KEY_ID,
 *                                 AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION
 *     Railway bucket variables  → BUCKET, ENDPOINT, ACCESS_KEY_ID, SECRET_ACCESS_KEY, REGION
 *                                 (BUCKET_NAME / BUCKET_ENDPOINT also accepted)
 *
 * Usage: npm run backup:db -w @sealvo/api
 */

import path from 'node:path';
import fs from 'node:fs';
import net from 'node:net';
import { execSync, spawnSync } from 'node:child_process';
import { CONTAINER, getConnection, readDumpInfo, useContainer } from './db-connection.mjs';
import { loadEnv } from './load-env.mjs';

loadEnv();

const BACKUPS_DIR = path.join(import.meta.dirname, '..', 'backups');
const RETENTION = parseInt(process.env.BACKUP_RETENTION, 10) || 7;
const BUCKET_PREFIX = 'backups';

/** This database's dumps only: "web" must not match the dumps of a "web_db" */
const dumpPattern = (db) =>
  new RegExp(`^${db.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_\\d{8}_\\d{6}\\.sql$`);

function getDumpFlags(useDocker) {
  const flags = [
    '--single-transaction',
    '--routines',
    '--triggers',
    '--default-character-set=utf8mb4',
  ];
  // --set-gtid-purged is MySQL-only; MariaDB's mysqldump (installed by
  // default-mysql-client on Debian) does not support it and will crash.
  try {
    const cmd = useDocker
      ? `docker exec ${CONTAINER} mysqldump --help 2>&1`
      : 'mysqldump --help 2>&1';
    const help = execSync(cmd, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    if (help.includes('set-gtid-purged')) flags.push('--set-gtid-purged=OFF');
  } catch {
    /* binary missing or MariaDB — skip the flag */
  }
  return flags;
}

/* ── helpers ─────────────────────────────────────────────── */

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

const BUCKET_VARIABLES = [
  {
    bucket: ['AWS_S3_BUCKET_NAME'],
    endpoint: ['AWS_ENDPOINT_URL'],
    accessKeyId: ['AWS_ACCESS_KEY_ID'],
    secretAccessKey: ['AWS_SECRET_ACCESS_KEY'],
    region: ['AWS_DEFAULT_REGION'],
  },
  {
    bucket: ['BUCKET', 'BUCKET_NAME'],
    endpoint: ['ENDPOINT', 'BUCKET_ENDPOINT'],
    accessKeyId: ['ACCESS_KEY_ID'],
    secretAccessKey: ['SECRET_ACCESS_KEY'],
    region: ['REGION'],
  },
];

function getBucketConfig() {
  const names = BUCKET_VARIABLES.find((set) => pick(...set.bucket));
  if (!names) return null;

  const endpoint = pick(...names.endpoint);
  const accessKeyId = pick(...names.accessKeyId);
  const secretAccessKey = pick(...names.secretAccessKey);
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    console.error(
      `[backup] ${names.bucket[0]} is set but not ${names.endpoint[0]}, ${names.accessKeyId[0]} and ${names.secretAccessKey[0]}.`,
    );
    process.exit(1);
  }

  return {
    bucket: pick(...names.bucket),
    endpoint: endpoint.replace(/\/$/, ''),
    region: pick(...names.region) || 'auto',
    accessKeyId,
    secretAccessKey,
  };
}

async function makeS3Client(cfg) {
  const { S3Client } = await import('@aws-sdk/client-s3');
  return new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
    forcePathStyle: true,
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

function backup(conn, useDocker, outPath) {
  const flags = getDumpFlags(useDocker);
  // Stream straight to the file: no maxBuffer limit, no full dump held in memory.
  const out = fs.openSync(outPath, 'w');
  const spawnOpts = { stdio: ['ignore', out, 'pipe'], encoding: 'utf8' };
  let result;

  console.log(`[backup] Dump flags: ${flags.join(' ')}`);

  if (useDocker) {
    console.log(`[backup] Using Docker container ${CONTAINER}`);
    result = spawnSync(
      'docker',
      [
        'exec',
        '-e',
        `MYSQL_PWD=${conn.password}`,
        CONTAINER,
        'mysqldump',
        '-u',
        conn.user,
        ...flags,
        conn.database,
      ],
      spawnOpts,
    );
  } else {
    console.log(`[backup] Using direct connection (${conn.host}:${conn.port})`);
    result = spawnSync(
      'mysqldump',
      ['-h', conn.host, '-P', conn.port, '-u', conn.user, ...flags, conn.database],
      { ...spawnOpts, env: { ...process.env, MYSQL_PWD: conn.password } },
    );
  }
  fs.closeSync(out);

  if (result.error || result.status !== 0) {
    fs.rmSync(outPath, { force: true });
    if (result.error) console.error('[backup] Error:', result.error.message);
    else console.error('[backup] mysqldump failed:', result.stderr);
    process.exit(1);
  }
}

/* ── verify ───────────────────────────────────────────────── */

async function verify(filePath) {
  const { tables } = await readDumpInfo(filePath);
  if (!tables.length) {
    console.error('[backup] FAILED: no CREATE TABLE in dump.');
    process.exit(1);
  }
  console.log(`[backup] Verified: ${tables.length} table(s) (${tables.join(', ')})`);
}

/* ── local retention ──────────────────────────────────────── */

function applyRetention(db) {
  const pattern = dumpPattern(db);
  const files = fs
    .readdirSync(BACKUPS_DIR)
    .filter((f) => pattern.test(f))
    .map((f) => ({
      name: f,
      mtime: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.mtime - a.mtime);

  files.slice(RETENTION).forEach((f) => {
    fs.unlinkSync(path.join(BACKUPS_DIR, f.name));
    console.log('[backup] Removed old:', f.name);
  });
}

/* ── bucket upload + retention ────────────────────────────── */

async function uploadToBucket(client, cfg, localPath, key) {
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  const { size } = fs.statSync(localPath);
  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: fs.createReadStream(localPath),
      ContentLength: size,
      ContentType: 'application/sql',
    }),
  );
  console.log(`[backup] Uploaded to bucket: ${key} (${(size / 1024).toFixed(1)} KB)`);
}

async function applyRetentionInBucket(client, cfg, db) {
  const { ListObjectsV2Command, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  const prefix = `${BUCKET_PREFIX}/${db}_`;
  const list = await client.send(new ListObjectsV2Command({ Bucket: cfg.bucket, Prefix: prefix }));
  const pattern = dumpPattern(db);
  const objects = (list.Contents || [])
    .filter((o) => o.Key && pattern.test(o.Key.slice(BUCKET_PREFIX.length + 1)))
    .sort((a, b) => (b.LastModified || 0) - (a.LastModified || 0));

  for (let i = RETENTION; i < objects.length; i++) {
    await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: objects[i].Key }));
    console.log('[backup] Removed from bucket:', objects[i].Key);
  }
  console.log(
    `[backup] Bucket retention: keeping ${Math.min(objects.length, RETENTION)}/${objects.length} dumps`,
  );
}

/* ── main ─────────────────────────────────────────────────── */

async function main() {
  const conn = getConnection('backup');
  const outPath = path.join(BACKUPS_DIR, `${conn.database}_${timestamp()}.sql`);

  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

  console.log('[backup] Starting...');

  const useDocker = useContainer(conn);
  if (!useDocker) {
    console.log(`[backup] Waiting for MySQL (${conn.host}:${conn.port})...`);
    const attempts = await waitForMySQL(conn.host, conn.port);
    console.log(`[backup] MySQL ready (${attempts} attempt${attempts > 1 ? 's' : ''})`);
  }

  backup(conn, useDocker, outPath);

  const sizeKB = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`[backup] Written: ${outPath} (${sizeKB} KB)`);

  await verify(outPath);
  applyRetention(conn.database);

  const bucketCfg = getBucketConfig();
  if (bucketCfg) {
    console.log(`[backup] Bucket detected (${bucketCfg.endpoint}), uploading...`);
    const client = await makeS3Client(bucketCfg);
    const key = `${BUCKET_PREFIX}/${path.basename(outPath)}`;
    await uploadToBucket(client, bucketCfg, outPath, key);
    await applyRetentionInBucket(client, bucketCfg, conn.database);
  } else {
    console.log('[backup] No bucket config found, skipping upload.');
  }

  console.log('[backup] Done.');
}

main().catch((err) => {
  console.error('[backup] Fatal:', err.message);
  process.exit(1);
});
