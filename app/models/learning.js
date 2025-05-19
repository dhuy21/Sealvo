const db = require('../core/database');

class Learning {
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

    async findWordsByLevel(user_id, level) {
        try { 
            const [rows] = await global.dbConnection.execute(
                `SELECT word_id
                 FROM learning
                 WHERE user_id = ?
                   AND level = ?`,
                [user_id, level]
            );
            return rows;
        } catch (error) {
            console.error("Erreur lors de la récupération des mots par niveau :", error);
            throw error;
        }
    }

    async countUserWordsByLevel(user_id, level) {
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
}
module.exports = new Learning();