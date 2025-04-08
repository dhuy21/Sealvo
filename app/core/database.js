const mysql = require('mysql2/promise');

async function connect() {

  try {// Configuration de la connexion à la base de données
    const db = await mysql.createConnection({
      host: 'localhost', // Remplacez par l'hôte de votre base de données
      user: 'root',      // Remplacez par votre nom d'utilisateur MySQL
      password: '123456789',      // Remplacez par votre mot de passe MySQL
      database: 'web_db' // Nom de la base de données
    });
    console.log('Connecté à la base de données MySQL.');
    return db;
  } catch (error) {
    console.error('Erreur de connexion à la base de données :', error.message);
    throw error;
  }
}
module.exports = { connect };