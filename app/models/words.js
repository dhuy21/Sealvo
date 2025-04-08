const db = require('../core/database');

class Word {
    // Récupérer tous les mots de l'utilisateur
    async findWordsByUserId(userId) {
        try {
            const [rows] = await global.dbConnection.execute(
                'SELECT *' +
                'FROM learning ' +
                'JOIN words ON learning.word_id = words.word_id ' +
                'WHERE learning.user_id = ? ' +
                'ORDER BY words.word ASC',
                [userId]
            );
            return rows;
        } catch (error) {
            console.error('Erreur lors de la récupération des mots:', error);
            throw error;
        }
    }
}

module.exports = new Word(); 