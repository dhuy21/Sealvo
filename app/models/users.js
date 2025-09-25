const crypto = require('crypto');

class User {
    // Générer un ID unique de 7 caractères
    generateUserId() {
        // Générer une chaîne aléatoire hexadécimale et prendre les 7 premiers caractères
        return crypto.randomBytes(4).toString('hex').substring(0, 7);
    }
    
    // Vérifier que la connexion à la base de données existe
    checkDbConnection() {
        if (!global.dbConnection) {
            throw new Error('La connexion à la base de données n\'est pas disponible. Veuillez vérifier la configuration et redémarrer l\'application.');
        }
    }
    async getAllUsers() {
        try {
            this.checkDbConnection();
            const [rows] = await global.dbConnection.execute('SELECT * FROM users');
            return rows;        
        } catch (error) {
            console.error('Erreur lors de la récupération de tous les utilisateurs :', error);
            throw error;
        }
    }
    async findById(user_id) {
        try {
            this.checkDbConnection();
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
            const [rows] = await global.dbConnection.execute('SELECT id FROM users WHERE email = ?', [email]);
            return rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la recherche de l\'utilisateur par email :', error);
            throw error;
        }
    }
    async findByUsername(username) {
        try {
            this.checkDbConnection();
            const [rows] = await global.dbConnection.execute('SELECT id, username, password, email, is_verified FROM users WHERE username = ?', [username]);
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
            this.checkDbConnection();
            // Générer un ID unique pour le nouvel utilisateur
            let userId = this.generateUserId();
            
            // Vérifier si l'ID existe déjà (peu probable mais par sécurité)
            let existingUser = await this.findById(userId);
            
            // Si l'ID existe déjà, en générer un nouveau jusqu'à en trouver un unique
            while (existingUser) {
                userId = this.generateUserId();
                existingUser = await this.findById(userId);
            }
            
            // Ensure all required values are defined - replace undefined with null for MySQL
            const username = userData.username;
            const email = userData.email;
            const password = userData.password;
            const ava = userData.ava || 1; // Default avatar is 1
            
            // Insérer l'utilisateur avec l'ID généré
            const [result] = await global.dbConnection.execute(
                'INSERT INTO users (id, username, email, password, ava) VALUES (?, ?, ?, ?, ?)', 
                [userId, username, email, password, ava]
            );
            
            return userId;
        } catch (error) {
            console.error('Erreur lors de la création de l\'utilisateur :', error);
            throw error;
        }
    }

    async updateAvatar(id, ava) {
        try {
            const [result] = await global.dbConnection.execute('UPDATE users SET ava = ? WHERE id = ?', [ava, id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'avatar :', error);
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

    async updateResetPasswordToken(email, token, expiresAt) {
        try {
            const [result] = await global.dbConnection.execute(
                'UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE email = ?',
                [token, expiresAt, email]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Erreur lors de la mise à jour du jeton de réinitialisation du mot de passe :', error);
            throw error;
        }
    }

    async updateLastLogin(id) {
        try {
            const [result] = await global.dbConnection.execute(
                'UPDATE users SET last_login = NOW() WHERE id = ?', 
                [id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la date de dernière connexion :', error);
            throw error;
        }
    }

    async updateStreakUpdatedAt(id) {
        try {
            const [result] = await global.dbConnection.execute(
                'UPDATE users SET streak_updated_at = NOW() WHERE id = ?', 
                [id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la date de mise à jour de la série :', error);
            throw error;
        }
    }

    async updateStreak(id, streak) {
        try {
            const [result] = await global.dbConnection.execute(
                'UPDATE users SET streak = ? WHERE id = ?', 
                [streak, id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la série :', error);
            throw error;
        }
    }

    async updatePassword(email, newPassword) {
        try {
            const [result] = await global.dbConnection.execute(
                'UPDATE users SET password = ? WHERE email = ?', 
                [newPassword, email]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Erreur lors de la mise à jour du mot de passe :', error);
            throw error;
        }
    }
    
    async updateUserInfo(id, userData) {
        try {
            let updated = false;
            
            if (userData.username) {
                const [result] = await global.dbConnection.execute(
                    'UPDATE users SET username = ? WHERE id = ?',
                    [userData.username, id]
                );
                updated = updated || result.affectedRows > 0;
            }
            if (userData.email) {
                const [result] = await global.dbConnection.execute(
                    'UPDATE users SET email = ? WHERE id = ?',
                    [userData.email, id]
                );
                updated = updated || result.affectedRows > 0;
            }
            if (userData.ava) {
                const [result] = await global.dbConnection.execute(
                    'UPDATE users SET ava = ? WHERE id = ?',
                    [userData.ava, id]
                );
                updated = updated || result.affectedRows > 0;
            }
            
            return updated;
        } catch (error) {
            console.error('Erreur lors de la mise à jour des informations de l\'utilisateur :', error);
            throw error;
        }
    }
    async getStreakById(id) {
        try {
            const [rows] = await global.dbConnection.execute('SELECT streak FROM users WHERE id = ?', [id]);
            return rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la récupération de la série :', error);
            throw error;
        }
    }
    async getDateUpdatedStreak(id) {
        try {
            const [rows] = await global.dbConnection.execute('SELECT streak_updated_at FROM users WHERE id = ?', [id]);
            return rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la récupération de la date de mise à jour de la série :', error);
            throw error;
        }
    }
    async getLastLogin(id) {
        try {
            const [rows] = await global.dbConnection.execute('SELECT last_login FROM users WHERE id = ?', [id]);
            return rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la récupération de la date de dernière connexion :', error);
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

    async deleteUserNotVerified() {
        try {
            const [result] = await global.dbConnection.execute('DELETE FROM users WHERE is_verified = FALSE AND DATE_ADD(DATE(created_at), INTERVAL 3 DAY) <= CURDATE()', []);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Erreur lors de la suppression des utilisateurs non vérifiés :', error);
            throw error;
        }
    }

    async updateUserVerified(id) {
        try {
            const [result] = await global.dbConnection.execute('UPDATE users SET is_verified = TRUE WHERE id = ?', [id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la vérification de l\'utilisateur :', error);
            throw error;
        }
    }
}

module.exports = new User();