const db = require('../core/database');

class Learning {
    getInterval(levelGame){

        let intervalDate = 0;
        switch (levelGame) {
            case 'x':
                intervalDate = 0;
                break;
            case '0':
                intervalDate = 2;
                break;
            case '1':
                intervalDate = 4;
                break;
            case '2':
                intervalDate = 10;
                break;
            case 'v':
                intervalDate = 20;
                break;
        }
        
        return parseInt(intervalDate,10);
    }    
    async levelWord(user_id, word_id){
        try {
            const [rows] = await global.dbConnection.execute('SELECT level FROM learning WHERE user_id = ? AND word_id = ?', [user_id, word_id]);
            return rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la recherche du niveau d\'apprentissage :', error);
            throw error;
        }
    }

    async updateLevelWord(user_id, word_id, levelCurrent){
        try {
            const dateMemorized = new Date();

            let newLevel;
            switch (levelCurrent) {
                case 'x':
                    newLevel = '0';
                    break;
                case '0':
                    newLevel = '1';
                    break;
                case '1':
                    newLevel = '2';
                    break;
                case '2':
                    newLevel = 'v';
                    break;
            }

            const [rows] = await global.dbConnection.execute(
                'UPDATE learning SET level = ?, date_memorized = ? WHERE user_id = ? AND word_id = ?', 
                [newLevel, dateMemorized, user_id, word_id]
            );
                    return rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la mise à jour du niveau d\'apprentissage :', error);
            throw error;
        }
    }

    async dateMemoryWord(user_id, word_id){
        try {
            const [rows] = await global.dbConnection.execute('SELECT date_memorized FROM learning WHERE user_id = ? AND word_id = ?', [user_id, word_id]);
            return rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la recherche de la date de mémoire :', error);
            throw error;
        }
    }

    async getNumWordsByLevel(user_id, level) {
        try {
            const [rows] = await global.dbConnection.execute(
                `SELECT COUNT(*) AS num_words
                 FROM learning
                 WHERE user_id = ? AND level = ?`,
                [user_id, level]
            );
            return rows[0].num_words;
        } catch (error) {
            console.error("Erreur lors de la récupération du nombre de mots par niveau :", error);
            throw error;
        }
    }

    async findWordsTodayToLearn(user_id) {
        try {
            const [rows] = await global.dbConnection.execute(
                `SELECT word_id
                 FROM learning
                 WHERE user_id = ?
                   AND (
                       (level = 'x' AND DATE_ADD(DATE(date_memorized), INTERVAL 0 DAY) <= CURDATE()) OR
                       (level = '0' AND DATE_ADD(DATE(date_memorized), INTERVAL 2 DAY) <= CURDATE()) OR
                       (level = '1' AND DATE_ADD(DATE(date_memorized), INTERVAL 4 DAY) <= CURDATE()) OR
                       (level = '2' AND DATE_ADD(DATE(date_memorized), INTERVAL 10 DAY) <= CURDATE()) OR
                       (level = 'v' AND DATE_ADD(DATE(date_memorized), INTERVAL 20 DAY) <= CURDATE())
                   );`,
                [user_id]
            );
            return rows;
        } catch (error) {
            console.error("Erreur lors de la récupération des mots à réviser aujourd'hui :", error);
            throw error;
        }
    }

    async findWordsTodayByLevel(user_id, level) {
        try {
            const [rows] = await global.dbConnection.execute(
                `SELECT word_id
                 FROM learning
                 WHERE user_id = ? AND level = ? 
                 AND (
                    (level = 'x' AND DATE_ADD(DATE(date_memorized), INTERVAL 0 DAY) <= CURDATE()) OR
                    (level = '0' AND DATE_ADD(DATE(date_memorized), INTERVAL 2 DAY) <= CURDATE()) OR
                    (level = '1' AND DATE_ADD(DATE(date_memorized), INTERVAL 4 DAY) <= CURDATE()) OR
                    (level = '2' AND DATE_ADD(DATE(date_memorized), INTERVAL 10 DAY) <= CURDATE()) OR
                    (level = 'v' AND DATE_ADD(DATE(date_memorized), INTERVAL 20 DAY) <= CURDATE())
                 );`,
                [user_id, level]
            );
            return rows;
        } catch (error) {
            console.error("Erreur lors de la récupération des mots à réviser aujourd'hui par niveau :", error);
            throw error;
        }
    }

    async findWordsByLevel(user_id, levelGame) {
        try { 
            const intervalDate = this.getInterval(levelGame);
            const [rows] = await global.dbConnection.execute(
                `SELECT word_id
                 FROM learning
                 WHERE user_id = ?
                   AND level = ?
                   AND DATE_ADD(DATE(date_memorized), INTERVAL ? DAY) <= CURDATE()`,
                [user_id, levelGame, intervalDate]
            );
            return rows;
        } catch (error) {
            console.error("Erreur lors de la récupération des mots par niveau :", error);
            throw error;
        }
    }

    async countUserWordsByLevel(user_id, level) {
        try {
            const intervalDate = this.getInterval(level);
            const [rows] = await global.dbConnection.execute(
                `SELECT COUNT(*) AS num_words
                 FROM learning
                 WHERE user_id = ? AND level = ?
                 AND DATE_ADD(DATE(date_memorized), INTERVAL ? DAY) <= CURDATE()`,
                [user_id, level, intervalDate]
            );
            return rows[0].num_words;
        } catch (error) {
            console.error("Erreur lors de la récupération du nombre de mots par niveau :", error);
            throw error;
        }
    }

    // Récupérer des mots aléatoires en excluant un mot spécifique
    async findRandomWordsExcluding(userId, excludeWordId, limit = 1, levelGame) {
        try {
            // Convertir explicitement les paramètres en entiers
            const limitInt = parseInt(limit, 10);
            const intervalDate = this.getInterval(levelGame)
            
            console.log(`findRandomWordsExcluding - userId: ${userId}, exclude: ${excludeWordId}, limit: ${limitInt}, level: ${levelGame}`);
            
            let query;
            let params;
            
            if (excludeWordId) {
                // Requête avec exclusion d'un mot spécifique
                query = 'SELECT w.word_id, w.word, wd.meaning, wd.example ' +
                        'FROM words w ' +
                        'JOIN word_details wd ON w.word_id = wd.word_id ' +
                        'JOIN learning ln ON w.word_id = ln.word_id ' +
                        'WHERE ln.user_id = ? AND w.word_id != ? AND ln.level = ? ' +
                        'AND DATE_ADD(DATE(ln.date_memorized), INTERVAL ? DAY) <= CURDATE()'+
                        'ORDER BY RAND() LIMIT 1';
                params = [userId, excludeWordId, levelGame, intervalDate];
            } else {
                // Requête sans exclusion
                query = 'SELECT w.word_id, w.word, wd.meaning, wd.example ' +
                        'FROM words w ' +
                        'JOIN word_details wd ON w.word_id = wd.word_id ' +
                        'JOIN learning ln ON w.word_id = ln.word_id ' +
                        'WHERE ln.user_id = ? AND ln.level = ? ' +
                        'AND DATE_ADD(DATE(ln.date_memorized), INTERVAL ? DAY) <= CURDATE()'+
                        'ORDER BY RAND() LIMIT 1';
                params = [userId, levelGame];
            }
            
            const [words] = await global.dbConnection.execute(query, params);
            
            return words;
        } catch (error) {
            console.error('Error in findRandomWordsExcluding:', error);
            throw error;
        }
    }


    // Récupérer plusieurs mots aléatoires pour le jeu Word Search
    async getRandomUserWords(userId, limit = 5, levelGame) {
        try {
            // Convertir explicitement les paramètres en entiers
            const limitInt = parseInt(limit, 10);
            const intervalDate = this.getInterval(levelGame);
            console.log(`getRandomUserWords - userId: ${userId}, limit: ${limitInt}`);
            
            // Requête pour récupérer plusieurs mots aléatoires
            // Avec MySQL, on ne peut pas utiliser ? pour LIMIT dans les requêtes préparées
            // On va donc intégrer directement la valeur dans la requête
            const query = `SELECT w.word_id, w.word, wd.meaning 
                    FROM words w 
                    JOIN word_details wd ON w.word_id = wd.word_id 
                    JOIN word_pronunciations wp ON wd.detail_id = wp.detail_id 
                    JOIN learning ln ON w.word_id = ln.word_id 
                    WHERE ln.user_id = ? AND ln.level = ? 
                    AND DATE_ADD(DATE(ln.date_memorized), INTERVAL ? DAY) <= CURDATE()
                    ORDER BY RAND() LIMIT ${limitInt}`;
            
            const [words] = await global.dbConnection.execute(query, [userId, levelGame, intervalDate]);
            
            return words;
        } catch (error) {
            console.error('Error in getRandomUserWords:', error);
            throw error;
        }
    }
}
module.exports = new Learning();