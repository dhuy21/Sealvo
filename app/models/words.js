const db = require('../core/database');

class Word {
    // Récupérer tous les mots de l'utilisateur
    async findWordsByUserId(userId) {
        try {
            const [rows] = await global.dbConnection.execute(
                'SELECT w.word_id, w.word, wd.meaning, wd.type, wd.synonyms, wd.antonyms, wd.example, wd.grammar, wp.pronunciation, ln.level ' +
                'FROM words w ' +
                'JOIN word_details wd ON w.word_id = wd.word_id ' +
                'JOIN word_pronunciations wp ON wd.detail_id = wp.detail_id ' +
                'JOIN learning ln ON w.word_id = ln.word_id ' +
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

    /**
     * Compte le nombre de mots dans le vocabulaire d'un utilisateur
     * @param {string|number} userId - L'ID de l'utilisateur
     * @returns {Promise<number>} Le nombre de mots
     */
    async countUserWords(userId) {
        try {
            // Ensure userId is treated as a string since user_id is CHAR(7) in the database
            const userIdStr = String(userId);
            console.log(`Counting words for user: ${userIdStr} (type: ${typeof userIdStr})`);
            
            const [rows] = await global.dbConnection.execute(
                'SELECT COUNT(*) as count FROM learning WHERE user_id = ?',
                [userIdStr]
            );
            
            console.log(`Found ${rows[0].count} words for user ${userIdStr}`);
            return rows[0].count;
        } catch (error) {
            console.error('Erreur lors du comptage des mots de l\'utilisateur:', error);
            console.error('Stack trace:', error.stack);
            // Return 0 as a fallback instead of throwing the error
            // This prevents the game page from crashing if there's a DB issue
            return 0;
        }
    }

    // Ajouter un nouveau mot
    async create(wordData, userId) {
        // Démarrer une transaction
        let transaction;
        try {
            console.log(`Démarrage transaction pour le mot: ${wordData.word}`);
            transaction = await global.dbConnection.beginTransaction();
            
            // 1. Insérer le mot dans la table words
            console.log(`Insertion dans words: ${wordData.word}, ${wordData.subject}`);
            const [wordResult] = await transaction.execute(
                'INSERT INTO words (word, subject) VALUES (?, ?)',
                [wordData.word, wordData.subject]
            );
            const wordId = wordResult.insertId;
            console.log(`Word inséré avec ID: ${wordId}`);

            // 2. Insérer les détails du mot
            console.log(`Insertion dans word_details pour word_id: ${wordId}`);
            const [detailResult] = await transaction.execute(
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
            await transaction.execute(
                'INSERT INTO word_pronunciations (detail_id, pronunciation) VALUES (?, ?)',
                [detailId, wordData.pronunciation]
            );

            // 4. Associer le mot à l'utilisateur avec le niveau spécifié
            console.log(`Insertion dans learning pour user_id: ${userId}, word_id: ${wordId}, level: ${wordData.level}`);
            console.log(typeof wordData.level);
            await transaction.execute(
                'INSERT INTO learning (user_id, word_id, level) VALUES (?, ?, ?)',
                [userId, wordId,wordData.level.toString()]
            );
            
            // Valider la transaction
            console.log(`Commit de la transaction pour le mot: ${wordData.word}`);
            await transaction.commit();
            console.log(`Transaction validée avec succès pour le mot: ${wordData.word}`);
            return wordId;
        } catch (error) {
            // Annuler la transaction en cas d'erreur
            console.error(`ROLLBACK pour le mot ${wordData.word}:`, error);
            if (transaction) {
                try {
                    await transaction.rollback();
                    console.log(`Rollback réussi pour le mot: ${wordData.word}`);
                } catch (rollbackError) {
                    console.error(`Erreur lors du rollback pour le mot ${wordData.word}:`, rollbackError);
                }
            }
            throw error;
        }
    }
    async deleteWord(wordId, userId) {
        try {
            console.log('Word ID:', wordId);
            console.log('User ID:', userId);
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
            await global.dbConnection.execute('DELETE FROM learning WHERE user_id = ?', [userId]);
            console.log('Tous les mots ont été supprimés avec succès');
            return true;
        } catch (error) {
            console.error('Erreur lors de la suppression de tous les mots:', error);
            throw error;
        }
    }

    async findUsersByWordId(word_id) {
        try {
            const [rows] = await global.dbConnection.execute(
                'SELECT * FROM learning WHERE word_id = ?',
                [word_id]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la recherche du mot:', error);
            throw error;
        }
    }
    async findWordById(word_id) {
        try {
            const [rows] = await global.dbConnection.execute(
                'SELECT * FROM words WHERE word_id = ?',
                [word_id]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la recherche du mot:', error);
            throw error;
        }
    }

    // Trouver un mot par son ID avec tous les détails
    async findById(wordId) {
        try {
            const [rows] = await global.dbConnection.execute(
                'SELECT w.word_id as id, w.word, w.subject, wd.type, wd.meaning, wd.synonyms, wd.antonyms, ' +
                'wd.example, wd.grammar, wp.pronunciation, ln.level, ln.user_id ' +
                'FROM words w ' +
                'JOIN word_details wd ON w.word_id = wd.word_id ' +
                'JOIN word_pronunciations wp ON wd.detail_id = wp.detail_id ' +
                'JOIN learning ln ON w.word_id = ln.word_id ' +
                'WHERE w.word_id = ?',
                [wordId]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la recherche du mot par ID:', error);
            throw error;
        }
    }

    async updateWord(wordData, wordId, userId) {
        let transaction;
        try {
            transaction = await global.dbConnection.beginTransaction();
            // Mettre à jour le mot dans la table words
            console.log(`Mise à jour du mot dans words: ${wordData.word}, ${wordData.subject}`);
            const [result] = await transaction.execute(
                'UPDATE words SET word = ?, subject = ? WHERE word_id = ?',
                [wordData.word, wordData.subject, wordId]
            );
            console.log(`Mot mis à jour avec succès: ${wordId}`);
            // Mettre à jour les détails du mot
            console.log(`Mise à jour des détails du mot pour word_id: ${wordId}`);
            await transaction.execute(
                'UPDATE word_details SET type = ?, meaning = ?, synonyms = ?, antonyms = ?, example = ?, grammar = ? WHERE word_id = ?',
                [
                    wordData.type,
                    wordData.meaning,
                    wordData.synonyms,
                    wordData.antonyms,
                    wordData.example,
                    wordData.grammar,
                    wordId
                ]
            );
            // Mettre à jour la prononciation
            console.log(`Mise à jour de la prononciation pour detail_id: ${wordId}`);
            await transaction.execute(
                'UPDATE word_pronunciations SET pronunciation = ? WHERE detail_id = ?',
                [wordData.pronunciation, wordId]
            );
            // Mettre à jour l'association avec l'utilisateur
            console.log(`Mise à jour de l'association avec l'utilisateur pour word_id: ${wordId}`);
            await transaction.execute(
                'UPDATE learning SET level = ? WHERE word_id = ? AND user_id = ?',
                [wordData.level, wordId, userId]
            );
           
            // Valider la transaction
            console.log(`Commit de la transaction pour le mot: ${wordData.word}`);  
            await transaction.commit();
            console.log(`Transaction validée avec succès pour le mot: ${wordData.word}`);
            return wordId;  
        } catch (error) {
            // Annuler la transaction en cas d'erreur
            console.error(`ROLLBACK pour le mot ${wordData.word}:`, error);
            if (transaction) {
                try {
                    await transaction.rollback();
                } catch (rollbackError) {
                    console.error(`Erreur lors du rollback pour le mot ${wordData.word}:`, rollbackError);
                }
            }
            console.error('Erreur lors de la mise à jour du mot:', error);
            throw error;
        }
    }

}

module.exports = new Word();