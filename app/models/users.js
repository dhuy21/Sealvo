const db = require('../core/database');
const crypto = require('crypto');

class User {
    // Générer un ID unique de 7 caractères
    generateUserId() {
        // Générer une chaîne aléatoire hexadécimale et prendre les 7 premiers caractères
        return crypto.randomBytes(4).toString('hex').substring(0, 7);
    }
    async getAllUsers() {
        try {
            const [rows] = await global.dbConnection.execute('SELECT * FROM users');
            return rows;        
        } catch (error) {
            console.error('Erreur lors de la récupération de tous les utilisateurs :', error);
            throw error;
        }
    }
    async findById(user_id) {
        try {
            const [rows] = await global.dbConnection.execute('SELECT * FROM users WHERE id = ?', [user_id]);
            return rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la recherche de l\'utilisateur par ID :', error);
            throw error;
        }
    }
    async findUsernameById(user_id) {
        try {
            const [rows] = await global.dbConnection.execute('SELECT username FROM users WHERE id = ?', [user_id]);
            return rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la recherche du nom d\'utilisateur par ID :', error);
            throw error;
        }
    }
    async findEmailById(user_id) {
        try {
            const [rows] = await global.dbConnection.execute('SELECT email FROM users WHERE id = ?', [user_id]);
            return rows[0] || null;
        } catch (error) {       
            console.error('Erreur lors de la recherche de l\'email de l\'utilisateur par ID :', error);
            throw error;
        }
    }   
    async findByEmail(email) {
        try {
            const [rows] = await global.dbConnection.execute('SELECT * FROM users WHERE email = ?', [email]);
            return rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la recherche de l\'utilisateur par email :', error);
            throw error;
        }
    }
    async findByUsername(username) {
        try {
            const [rows] = await global.dbConnection.execute('SELECT * FROM users WHERE username = ?', [username]);
            return rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la recherche de l\'utilisateur par username :', error);
            throw error;
        }
    }

    async findStreakById(user_id) {
        try {
            const [rows] = await global.dbConnection.execute('SELECT streak FROM users WHERE id = ?', [user_id]);
            return rows[0] || null;
        }catch (error) {
            console.error('Erreur lors de la recherche de la série de l\'utilisateur par ID :', error);
            throw error;
        }
    }
    
    async create(userData) {
        try {
            // Générer un ID unique pour le nouvel utilisateur
            let userId = this.generateUserId();
            
            // Vérifier si l'ID existe déjà (peu probable mais par sécurité)
            let existingUser = await this.findById(userId);
            
            // Si l'ID existe déjà, en générer un nouveau jusqu'à en trouver un unique
            while (existingUser) {
                userId = this.generateUserId();
                existingUser = await this.findById(userId);
            }
            
            // Insérer l'utilisateur avec l'ID généré
            const [result] = await global.dbConnection.execute(
                'INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)', 
                [userId, userData.username, userData.email, userData.password]
            );
            
            return userId;
        } catch (error) {
            console.error('Erreur lors de la création de l\'utilisateur :', error);
            throw error;
        }
    }
    async update(id, userData) {
        try {
            const [result] = await global.dbConnection.execute(
                'UPDATE users SET username = ?, email = ?, password = ? WHERE id = ?', 
                [userData.username, userData.email, userData.password, id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'utilisateur :', error);
            throw error;
        }
    }
    async delete(id) {
        try {
            const [result] = await global.dbConnection.execute('DELETE FROM users WHERE id = ?', [id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'utilisateur :', error);
            throw error;
        }
    }
}

module.exports = new User();