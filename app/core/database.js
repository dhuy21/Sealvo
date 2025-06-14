const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv').config({ path: path.join(__dirname, '../../app/config/.env') });

let pool = null;

async function connect() {
  try {
    // Create connection pool instead of single connection
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      port: process.env.DB_PORT,
      ssl: {
        // Azure MySQL requires SSL with mode=require
        rejectUnauthorized: true
      },
      // Connection pool settings
      connectionLimit: 10,
      queueLimit: 0,
      // Connection timeout and cleanup
      idleTimeout: 300000, // 5 minutes
      // Prevent connection timeout issues
      keepAliveInitialDelay: 0,
      enableKeepAlive: true
    });

    // Test the connection
    const connection = await pool.getConnection();
    console.log('Connecté à la base de données MySQL avec pool de connexions.');
    connection.release();
    
    return createConnectionWrapper(pool);
  } catch (error) {
    console.error('Erreur de connexion à la base de données :', error.message);
    throw error;
  }
}

// Create a wrapper that provides the same interface as a single connection
// but uses the pool and handles connection errors
function createConnectionWrapper(pool) {
  return {
    async execute(sql, params) {
      let connection;
      try {
        connection = await pool.getConnection();
        const result = await connection.execute(sql, params);
        return result;
      } catch (error) {
        console.error('Database execution error:', error.message);
        // If it's a connection error, the pool will automatically handle reconnection
        throw error;
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
        }
      };
    },

    // Add method to gracefully close the pool
    async end() {
      if (pool) {
        await pool.end();
        pool = null;
        console.log('Database pool fermé.');
      }
    }
  };
}

// Export both the connect function and a method to get the current pool
module.exports = { 
  connect,
  getPool: () => pool
};