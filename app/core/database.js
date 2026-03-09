const mysql = require('mysql2/promise');

let pool = null;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

async function connect() {
  try {
    pool = mysql.createPool({
      host: process.env.MYSQLHOST,
      user: process.env.MYSQLUSER,
      password: process.env.MYSQL_ROOT_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: process.env.MYSQLPORT,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 30000,
      idleTimeout: 300000,
      keepAliveInitialDelay: 0,
      enableKeepAlive: true,
    });

    const connection = await pool.getConnection();
    connection.release();

    return createConnectionWrapper(pool);
  } catch (error) {
    console.error('Erreur de connexion à la base de données :', error.message);
    throw error;
  }
}

function isRetryable(err) {
  const codes = ['ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET', 'EPIPE', 'PROTOCOL_CONNECTION_LOST'];
  return codes.includes(err.code) || codes.includes(err?.cause?.code);
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createConnectionWrapper(pool) {
  async function executeWithRetry(sql, params) {
    let lastErr;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      let connection;
      try {
        connection = await pool.getConnection();
        const result = await connection.execute(sql, params);
        return result;
      } catch (err) {
        lastErr = err;
        if (attempt < MAX_RETRIES && isRetryable(err)) {
          console.warn(
            `[db] Query failed (attempt ${attempt}/${MAX_RETRIES}): ${err.code} — retrying in ${RETRY_DELAY_MS}ms...`
          );
          await sleep(RETRY_DELAY_MS);
        } else {
          throw err;
        }
      } finally {
        if (connection) {
          try {
            connection.release();
          } catch {
            /* connection already released or destroyed */
          }
        }
      }
    }
    throw lastErr;
  }

  return {
    execute: executeWithRetry,

    async beginTransaction() {
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      return {
        async execute(sql, params) {
          return await connection.execute(sql, params);
        },
        async commit() {
          await connection.commit();
          connection.release();
        },
        async rollback() {
          await connection.rollback();
          connection.release();
        },
      };
    },

    async end() {
      if (pool) {
        await pool.end();
        pool = null;
        console.log('Database pool fermé.');
      }
    },
  };
}

module.exports = {
  connect,
  getPool: () => pool,
};
