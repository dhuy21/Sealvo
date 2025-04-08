const mysql = require('mysql2');

// Configuration de la connexion à la base de données
const db = mysql.createConnection({
  host: 'localhost', // Remplacez par l'hôte de votre base de données
  user: 'root',      // Remplacez par votre nom d'utilisateur MySQL
  password: '123456789',      // Remplacez par votre mot de passe MySQL
  database: 'web_db' // Nom de la base de données
});

// Établir la connexion
db.connect((err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données :', err.message);
    return;
  }
  console.log('Connecté à la base de données MySQL.');
});

module.exports = db;