const db = require('../core/database');

class Word {
    // Récupérer tous les mots d'un package
    async findWordsByPackageId(package_id) {
        try {
            const [rows] = await global.dbConnection.execute(
                'SELECT wd.detail_id, w.word_id, w.word, w.language_code, wd.meaning, wd.type, wd.synonyms, wd.antonyms, wd.example, wd.grammar, wd.pronunciation, ln.level, ln.package_id ' +
                'FROM words w ' +
                'JOIN word_details wd ON w.word_id = wd.word_id ' +
                'JOIN learning ln ON wd.detail_id = ln.detail_id ' +
                'WHERE ln.package_id = ? ' +
                'ORDER BY w.word ASC',
                [package_id]
            );
            return rows;
        } catch (error) {
            console.error('Erreur lors de la récupération des mots:', error);
            throw error;
        }
    }

    /**
     * Compte le nombre de mots  d'un utilisateur dans tous ses packages
     * @param {string|number} userId - L'ID de l'utilisateur
     * @returns {Promise<number>} Le nombre de mots
     */
    async countUserWords(userId) {
        try {
            // Ensure userId is treated as a string since user_id is CHAR(7) in the database
            const userIdStr = String(userId);
            
            const [rows] = await global.dbConnection.execute(
                'SELECT COUNT(*) as count ' +
                'FROM learning l ' +
                'JOIN word_details wd ON l.detail_id = wd.detail_id ' +
                'JOIN words w ON wd.word_id = w.word_id ' +
                'JOIN packages p ON l.package_id = p.package_id ' +
                'WHERE p.user_id = ?',
                [userIdStr]
            );
            
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
    async create(wordData, package_id) {
        // Démarrer une transaction
        let transaction;
        try {
            transaction = await global.dbConnection.beginTransaction();
            let wordId
            // 1. Insérer le mot dans la table words
            // Vérifier si le mot existe déjà dans la table words
            const [existingWord] = await transaction.execute(
                'SELECT word_id FROM words WHERE word = ? AND subject = ? AND language_code = ?',
                [wordData.word, wordData.subject, wordData.language_code]
            );
            if (existingWord.length === 0) {
                // Insérer le mot dans la table words
                const [wordResult] = await transaction.execute(
                    'INSERT INTO words (word, subject, language_code) VALUES (?, ?, ?)',
                    [wordData.word, wordData.subject, wordData.language_code]
                );
                 wordId = wordResult.insertId;
            } else {
                wordId = existingWord[0].word_id;
            }
            
            // 2. Insérer les détails du mot
            const [detailResult] = await transaction.execute(
                'INSERT INTO word_details (word_id, type, meaning, pronunciation, synonyms, antonyms, example, grammar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    wordId,
                    wordData.type,
                    wordData.meaning,
                    wordData.pronunciation,
                    wordData.synonyms,
                    wordData.antonyms,
                    wordData.example,
                    wordData.grammar
                ]
            );
            const detailId = detailResult.insertId;

            // 3. Associer le mot à l'utilisateur avec le niveau spécifié
            await transaction.execute(
                'INSERT INTO learning (package_id, detail_id, level) VALUES (?, ?, ?)',
                [package_id, detailId,wordData.level.toString()]
            );
            
            // Valider la transaction
            await transaction.commit();
            return wordId;
        } catch (error) {
            // Annuler la transaction en cas d'erreur
            console.error(`ROLLBACK pour le mot ${wordData.word}:`, error);
            if (transaction) {
            try {
                    await transaction.rollback();
                console.error(`Rollback réussi pour le mot: ${wordData.word}`);
            } catch (rollbackError) {
                console.error(`Erreur lors du rollback pour le mot ${wordData.word}:`, rollbackError);
                }
            }
            throw error;
        }
    }

    //Supprimer un mot
    async deleteWord(detailId, packageId) {
        try {

            await global.dbConnection.execute(
                'DELETE FROM learning WHERE detail_id = ? AND package_id = ?',
                [detailId, packageId]
            );
            return true;
        } catch (error) {
            console.error('Erreur lors de la suppression du mot:', error);
            throw error;
        }
    }

    //Supprimer tous les mots d'un package d'un utilisateur
    async deleteAllWords(packageId) {
        try {
            await global.dbConnection.execute('DELETE FROM learning WHERE package_id = ?', [packageId]);
            return true;
        } catch (error) {
            console.error('Erreur lors de la suppression de tous les mots:', error);
            throw error;
        }
    }


    //Trouver les utilisateurs qui ont appris un mot par son detail_id
    async findUsersByWordId(detail_id) {
        try {
            const [rows] = await global.dbConnection.execute(
                'SELECT * FROM learning WHERE detail_id = ?',
                [detail_id]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la recherche du mot:', error);
            throw error;
        }
    }


    // Trouver un mot par son ID avec tous les détails
    async findById(detailId) {
        try {
            const [rows] = await global.dbConnection.execute(
                'SELECT wd.detail_id as id, w.word, w.language_code, w.subject, wd.type, wd.meaning, wd.synonyms, wd.antonyms, ' +
                'wd.example, wd.grammar, wd.pronunciation, ln.level, ln.package_id ' +
                'FROM words w ' +
                'JOIN word_details wd ON w.word_id = wd.word_id ' +
                'JOIN learning ln ON wd.detail_id = ln.detail_id ' +
                'WHERE wd.detail_id = ?',
                [detailId]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la recherche du mot par ID:', error);
            throw error;
        }
    }

    async updateWord(wordData, detailId, packageId) {
        let transaction;
        try {
            transaction = await global.dbConnection.beginTransaction();
            
            // 1. Récupérer les infos actuelles
            const [currentDetails] = await transaction.execute(
                'SELECT wd.*, w.word, w.subject, w.language_code FROM word_details wd ' +
                'JOIN words w ON wd.word_id = w.word_id WHERE wd.detail_id = ?',
                [detailId]
            );
            
            if (!currentDetails.length) {
                throw new Error('Mot non trouvé');
            }
            
            const current = currentDetails[0];
            const wordChanged = current.word !== wordData.word || 
                               current.subject !== wordData.subject || 
                               current.language_code !== wordData.language_code;
            
            let wordId = current.word_id;
            
            // 2. Si le mot de base a changé, gérer le nouveau mot
            if (wordChanged) {
                const [existingWord] = await transaction.execute(
                    'SELECT word_id FROM words WHERE word = ? AND subject = ? AND language_code = ?',
                    [wordData.word, wordData.subject, wordData.language_code]
                );
                
                if (existingWord.length === 0) {
                    // Créer nouveau mot dans words
                    const [wordResult] = await transaction.execute(
                        'INSERT INTO words (word, subject, language_code) VALUES (?, ?, ?)',
                        [wordData.word, wordData.subject, wordData.language_code]
                    );
                    wordId = wordResult.insertId;
                } else {
                    wordId = existingWord[0].word_id;
                }
                
                // Mettre à jour le word_id dans word_details
                await transaction.execute(
                    'UPDATE word_details SET word_id = ? WHERE detail_id = ?',
                    [wordId, detailId]
                );
            }
            
            // 3. Mettre à jour les détails du mot (spécifique à l'utilisateur)
            await transaction.execute(
                'UPDATE word_details SET type = ?, meaning = ?, pronunciation = ?, synonyms = ?, antonyms = ?, example = ?, grammar = ? WHERE detail_id = ?',
                [
                    wordData.type,
                    wordData.meaning,
                    wordData.pronunciation,
                    wordData.synonyms,
                    wordData.antonyms,
                    wordData.example,
                    wordData.grammar,
                    detailId
                ]
            );

            // 4. Mettre à jour l'association avec l'utilisateur
            await transaction.execute(
                'UPDATE learning SET level = ? WHERE detail_id = ? AND package_id = ?',
                [wordData.level, detailId, packageId]
            );

            // Valider la transaction 
            await transaction.commit();
            
            return detailId;  
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