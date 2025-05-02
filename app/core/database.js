const mysql = require('mysql2/promise');
const config = require('../config/env');
const fs = require('fs');
const path = require('path');

async function connect() {
  try {
    // Configuration de la connexion à la base de données
    const db = await mysql.createConnection({
      host: process.env.DB_HOST || config.DB_HOST, 
      user: process.env.DB_USER || config.DB_USER,
      password: process.env.DB_PASSWORD || config.DB_PASSWORD,
      database: process.env.DB_DATABASE || config.DB_DATABASE,
      port: process.env.DB_PORT || config.DB_PORT,
      ssl: {
        // Azure MySQL requires SSL
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