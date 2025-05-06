const mysql = require('mysql2/promise');


async function connect() {
  try {
    // Configuration de la connexion à la base de données
    const db = await mysql.createConnection({
      host: process.env.DB_HOST, 
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      port: process.env.DB_PORT,
      ssl: {
        // Azure MySQL requires SSL with mode=require
        rejectUnauthorized: true
      }
    });
    console.log('Connecté à la base de données MySQL.');
    return db;
  } catch (error) {
    console.error('Erreur de connexion à la base de données :', error.message);
    throw error;
  }
}
module.exports = { connect };