const db = require('../core/database');

class Word {
    // Récupérer tous les mots de l'utilisateur
    async findWordsByUserId(userId) {
        try {
            const [rows] = await global.dbConnection.execute(
                'SELECT w.word_id as id, w.word, wd.meaning, wd.type, wd.synonyms, wd.antonyms, wd.example, wd.grammar, wp.pronunciation, ln.level ' +
                'FROM words w ' +
                'JOIN word_details wd ON w.word_id = wd.word_id ' +
                'JOIN word_pronunciations wp ON wd.detail_id = wp.detail_id ' +
                'JOIN learning ln ON w.word_id = ln.word_id ' +
                'WHERE ln.user_id = ? ' +
                'ORDER BY w.word ASC',
                [userId]
            );
            console.log("Mots récupérés:", rows.map(r => `${r.word} (niveau: ${r.level})`));
            return rows;
        } catch (error) {
            console.error('Erreur lors de la récupération des mots:', error);
            throw error;
        }
    }

    // Ajouter un nouveau mot
    async create(wordData, userId) {
        // Démarrer une transaction
        
        try {
            console.log(`Démarrage transaction pour le mot: ${wordData.word}`);
            await global.dbConnection.beginTransaction();
            
            // 1. Insérer le mot dans la table words
            console.log(`Insertion dans words: ${wordData.word}, ${wordData.subject}`);
            const [wordResult] = await global.dbConnection.execute(
                'INSERT INTO words (word, subject) VALUES (?, ?)',
                [wordData.word, wordData.subject]
            );
            const wordId = wordResult.insertId;
            console.log(`Word inséré avec ID: ${wordId}`);

            // 2. Insérer les détails du mot
            console.log(`Insertion dans word_details pour word_id: ${wordId}`);
            const [detailResult] = await global.dbConnection.execute(
                'INSERT INTO word_details (word_id, type, meaning, synonyms, antonyms, example, grammar) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [
                    wordId,
                    wordData.type,
                    wordData.meaning,
                    wordData.synonyms,
                    wordData.antonyms,
                    wordData.example,
                    wordData.grammar
                ]
            );
            const detailId = detailResult.insertId;
            console.log(`Detail inséré avec ID: ${detailId}`);

            // 3. Insérer la prononciation
            console.log(`Insertion dans word_pronunciations pour detail_id: ${detailId}`);
            await global.dbConnection.execute(
                'INSERT INTO word_pronunciations (detail_id, pronunciation) VALUES (?, ?)',
                [detailId, wordData.pronunciation]
            );

            // 4. Associer le mot à l'utilisateur avec le niveau spécifié
            console.log(`Insertion dans learning pour user_id: ${userId}, word_id: ${wordId}, level: ${wordData.level}`);
            await global.dbConnection.execute(
                'INSERT INTO learning (user_id, word_id, level) VALUES (?, ?, ?)',
                [userId, wordId,wordData.level.toString()]
            );
            console.log(typeof wordData.level);
            // Valider la transaction
            console.log(`Commit de la transaction pour le mot: ${wordData.word}`);
            await global.dbConnection.commit();
            console.log(`Transaction validée avec succès pour le mot: ${wordData.word}`);
            return wordId;
        } catch (error) {
            // Annuler la transaction en cas d'erreur
            console.error(`ROLLBACK pour le mot ${wordData.word}:`, error);
            try {
                await global.dbConnection.rollback();
                console.log(`Rollback réussi pour le mot: ${wordData.word}`);
            } catch (rollbackError) {
                console.error(`Erreur lors du rollback pour le mot ${wordData.word}:`, rollbackError);
            }
            throw error;
        }
    }
    async deleteWord(wordId, userId) {
        try {
            await global.dbConnection.execute(
                'DELETE FROM learning WHERE word_id = ? AND user_id = ?',
                [wordId, userId]
            );
            console.log(`Mot supprimé avec succès: ${wordId}`);
            return true;
        } catch (error) {
            console.error('Erreur lors de la suppression du mot:', error);
            throw error;
        }
    }

    async deleteAllWords(userId) {
        try {
            await global.dbConnection.execute('DELETE FROM learning WHERE user_id = ?', [userId]);s
            console.log('Tous les mots ont été supprimés avec succès');
            return true;
        } catch (error) {
            console.error('Erreur lors de la suppression de tous les mots:', error);
            throw error;
        }
    }

   
}

module.exports = new Word(); 