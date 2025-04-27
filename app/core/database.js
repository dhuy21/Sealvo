const mysql = require('mysql2/promise');

async function connect() {
  try {
    // Configuration de la connexion à la base de données
    const db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost', 
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456789',
      database: process.env.DB_DATABASE || 'web_db'
    });
    console.log('Connecté à la base de données MySQL.');
    return db;
  } catch (error) {
    console.error('Erreur de connexion à la base de données :', error.message);
    throw error;
  }
}
module.exports = { connect };