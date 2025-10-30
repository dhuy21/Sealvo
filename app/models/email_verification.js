const crypto = require('crypto');

class Email_verification {

     generateId() { 
        return crypto.randomBytes(32).toString('hex'); //create a random id of 64 characters
    }

    async generateToken() {
        const token = crypto.randomBytes(32).toString('hex');
        const expires_at = new Date(Date.now() + 1000 * 60 * 60 * 3); // 3 hours
        const token_hash = crypto.createHash('sha256').update(token).digest('hex');
        try {
            //verifier si le token existe déjà
            const [result] = await global.dbConnection.execute(
                'SELECT id FROM email_verification WHERE token_hash = ?',
                [token_hash]
            );
            if (result.length > 0) {
                return this.generateToken();
            }
            return { expires_at, token, token_hash };
        } catch (error) {
            console.error('Erreur lors de la génération du token :', error);
            throw error;
        }
    }
    
    async saveToken(user_id, expires_at, token_hash) {
        const id = this.generateId();
        let transaction;
        try {
            transaction = await global.dbConnection.beginTransaction();
            //Revoke all tokens for this user
            await transaction.execute(
                'UPDATE email_verification SET status = "revoked" WHERE user_id = ?',
                [user_id]
            );
            const [result] = await transaction.execute(
                'INSERT INTO email_verification (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
                [id, user_id, token_hash, expires_at]
            );
            await transaction.commit();
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du token :', error);
            throw error;
        }
    }

    async verifyToken(token) {
        const token_hash = crypto.createHash('sha256').update(token).digest('hex');
        try {
            const [result] = await global.dbConnection.execute(
                'SELECT id, user_id FROM email_verification WHERE token_hash = ? AND expires_at > NOW() AND status = "pending" AND used_at IS NULL',
                [token_hash]
            );
            if (result.length > 0) {
                return result[0];
            }
            return null;
        } catch (error) {
            console.error('Erreur lors de la vérification du token :', error);
            throw error;
        }
    }

    async markTokenAsRevoked(user_id) {
        try {
            const [result] = await global.dbConnection.execute(
            'UPDATE email_verification SET status = "revoked" WHERE user_id = ?',
            [user_id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Erreur lors de la marque du token comme utilisé :', error);
            throw error;
        }
    }

    async markTokenAsUsed(token) {
        const token_hash = crypto.createHash('sha256').update(token).digest('hex');
        try {
            const [result] = await global.dbConnection.execute(
            'UPDATE email_verification SET status = "used", used_at = NOW() WHERE token_hash = ?',
            [token_hash]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Erreur lors de la marque du token comme utilisé :', error);
            throw error;
        }
    }
    
    async deleteUserExpired() {
        try {
            const [result] = await global.dbConnection.execute(
            'DELETE FROM email_verification WHERE DATE_ADD(DATE(created_at), INTERVAL 15 DAY) <= CURDATE()',
            []
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Erreur lors de la suppression des tokens expirés :', error);
            throw error;
        }
    }
}

module.exports = new Email_verification();