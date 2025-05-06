const crypto = require('crypto');

class ResetPassword {
    
    async createResetPasswordToken() {
        try {
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 1);

            return { token, expiresAt };
        } catch (error) {
            console.error('Erreur lors de la création du jeton de réinitialisation du mot de passe :', error);
            throw error;
        }
    }

    async saveResetPasswordToken(email, token, expiresAt) {
        try {
            // Delete any existing tokens for this email first
            await global.dbConnection.execute(
                'DELETE FROM reset_password WHERE email = ?',
                [email]
            );
            
            // Then insert the new token
            const [result] = await global.dbConnection.execute(
                'INSERT INTO reset_password (email, token, expires_at) VALUES (?, ?, ?)',
                [email, token, expiresAt]
            );

            return result.affectedRows > 0;
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du jeton de réinitialisation du mot de passe :', error);
            throw error;
        }
    }

    async getResetPasswordToken(email) {
        try {
            const [result] = await global.dbConnection.execute(
                'SELECT token, expires_at, used FROM reset_password WHERE email = ?',
                [email]
            );

            return result[0];
        } catch (error) {
            console.error('Erreur lors de la récupération du jeton de réinitialisation du mot de passe :', error);
            throw error;
        }
    }

    async findByToken(token) {
        try {
            const [result] = await global.dbConnection.execute(
                'SELECT email, token, expires_at, used FROM reset_password WHERE token = ?  LIMIT 1',
                [token]
            );

            return result[0];
        } catch (error) {
            console.error('Erreur lors de la récupération du jeton par token :', error);
            throw error;
        }
    }

    async markTokenAsUsed(token) {
        try {
            const [result] = await global.dbConnection.execute(
                'UPDATE reset_password SET used = TRUE WHERE token = ?',
                [token]
            );

            return result.affectedRows > 0;
        } catch (error) {
            console.error('Erreur lors de la marque du jeton comme utilisé :', error);
            throw error;
        }
    }
}

module.exports = new ResetPassword();