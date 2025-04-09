const db = require('../core/database');

class Word {
    // Récupérer tous les mots de l'utilisateur
    async findWordsByUserId(userId) {
        try {
            const [rows] = await global.dbConnection.execute(
                'SELECT w.word, wd.meaning, wd.type, wd.synonyms, wd.antonyms, wd.example, wd.grammar, wp.pronunciation ' +
                'FROM word_details wd natural join learning ln natural join words w natural join word_pronunciations wp ' +
                'WHERE ln.user_id = ? ' +
                'ORDER BY w.word ASC',
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