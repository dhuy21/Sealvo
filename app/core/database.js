const mysql = require('mysql2/promise');

let pool = null;

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
      idleTimeout: 300000, // 5 minutes
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

function createConnectionWrapper(pool) {
  return {
    async execute(sql, params) {
      let connection;
      try {
        connection = await pool.getConnection();
        const result = await connection.execute(sql, params);
        return result;
      } finally {
        if (connection) {
          connection.release();
        }
      }
    },

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
