const db = require('../core/database');

class Learning {

    getInterval(levelGame){
        let intervalDate = 0;
        switch (levelGame) {
            case 'x':
                intervalDate = 0;
                break;
            case '0':
                intervalDate = 0;
                break;
            case '1':
                intervalDate = 0;
                break;
            case '2':
                intervalDate = 0;
                break;
            case 'v':
                intervalDate = 20;
                break;
        }
        return parseInt(intervalDate,10);
    }

    // function to get the level of a word in a package
    async levelWord(package_id, detail_id){
        try {
            const [rows] = await global.dbConnection.execute('SELECT level FROM learning WHERE package_id = ? AND detail_id = ?', [package_id, detail_id]);
            return rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la recherche du niveau d\'apprentissage :', error);
            throw error;
        }
    }

    // function to update the level of a word in a package
    async updateLevelWord(package_id, detail_id, levelCurrent){
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
                'UPDATE learning SET level = ?, date_memorized = ? WHERE package_id = ? AND detail_id = ?', 
                [newLevel, dateMemorized, package_id, detail_id]
            );
                    return rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la mise à jour du niveau d\'apprentissage :', error);
            throw error;
        }
    }

    //function to get the date of memorization of a word in a package
    async dateMemoryWord(package_id, detail_id){
        try {
            const [rows] = await global.dbConnection.execute('SELECT date_memorized FROM learning WHERE package_id = ? AND detail_id = ?', [package_id, detail_id]);
            return rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la recherche de la date de mémoire :', error);
            throw error;
        }
    }

    //function to stock a word in a package
    async stockWord(package_id, detail_id, level){
        try {
            const [rows] = await global.dbConnection.execute('INSERT INTO learning (package_id, detail_id, level) VALUES (?, ?, ?)', [package_id, detail_id, level]);
            return rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la mise à jour du niveau d\'apprentissage :', error);
            throw error;
        }
    }
    // function to get the number of words of user in all packages by level
    async getNumWordsByLevelAllPackages(user_id, level) {
        try {
            const [rows] = await global.dbConnection.execute(
                `SELECT COUNT(*) AS num_words 
                 FROM learning l
                 JOIN word_details wd ON l.detail_id = wd.detail_id
                 JOIN words w ON wd.word_id = w.word_id
                 JOIN packages p ON l.package_id = p.package_id
                 WHERE p.user_id = ? AND l.level = ?`, [user_id, level]);
            return rows[0].num_words;
        } catch (error) {
            console.error("Erreur lors de la récupération du nombre de mots par niveau dans tous les packages :", error);
            throw error;
        }
    }

    // function to get the number of words of user in a package by level
    async getNumWordsByLevel(package_id, level) {
        try {
            const [rows] = await global.dbConnection.execute(
                `SELECT COUNT(*) AS num_words
                 FROM learning
                 WHERE package_id = ? AND level = ?`,
                [package_id, level]
            );
            return rows[0].num_words;
        } catch (error) {
            console.error("Erreur lors de la récupération du nombre de mots par niveau :", error);
            throw error;
        }
    }
    // function to get the words of user to learn today in all packages
    async findWordsTodayToLearnAllPackages(user_id) {
        try {
            const [rows] = await global.dbConnection.execute(
                `SELECT l.detail_id, p.package_id, p.package_name
                 FROM learning l
                 JOIN packages p ON l.package_id = p.package_id
                 JOIN users u ON p.user_id = u.id
                 WHERE u.id = ? AND p.is_active = true
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
            console.error("Erreur lors de la récupération des mots à réviser aujourd'hui dans tous les packages :", error);
            throw error;
        }
    }
    // function to get the words of user to learn today in a package
    async findWordsTodayToLearn(package_id) {
        try {
            const [rows] = await global.dbConnection.execute(
                `SELECT detail_id, package_id
                 FROM learning
                 WHERE package_id = ?
                   AND (
                       (level = 'x' AND DATE_ADD(DATE(date_memorized), INTERVAL 0 DAY) <= CURDATE()) OR
                       (level = '0' AND DATE_ADD(DATE(date_memorized), INTERVAL 2 DAY) <= CURDATE()) OR
                       (level = '1' AND DATE_ADD(DATE(date_memorized), INTERVAL 4 DAY) <= CURDATE()) OR
                       (level = '2' AND DATE_ADD(DATE(date_memorized), INTERVAL 10 DAY) <= CURDATE()) OR
                       (level = 'v' AND DATE_ADD(DATE(date_memorized), INTERVAL 20 DAY) <= CURDATE())
                   );`,
                [package_id]
            );
            return rows;
        } catch (error) {
            console.error("Erreur lors de la récupération des mots à réviser aujourd'hui :", error);
            throw error;
        }
    }

    // function to get the words of user to learn today by level in a package
    async findWordsTodayByLevel(package_id, level) {
        try {
            const [rows] = await global.dbConnection.execute(
                `SELECT detail_id
                 FROM learning
                 WHERE package_id = ? AND level = ? 
                 AND (
                    (level = 'x' AND DATE_ADD(DATE(date_memorized), INTERVAL 0 DAY) <= CURDATE()) OR
                    (level = '0' AND DATE_ADD(DATE(date_memorized), INTERVAL 2 DAY) <= CURDATE()) OR
                    (level = '1' AND DATE_ADD(DATE(date_memorized), INTERVAL 4 DAY) <= CURDATE()) OR
                    (level = '2' AND DATE_ADD(DATE(date_memorized), INTERVAL 10 DAY) <= CURDATE()) OR
                    (level = 'v' AND DATE_ADD(DATE(date_memorized), INTERVAL 20 DAY) <= CURDATE())
                 );`,
                [package_id, level]
            );
            return rows;
        } catch (error) {
            console.error("Erreur lors de la récupération des mots à réviser aujourd'hui par niveau :", error);
            throw error;
        }
    }
    
    // function to get the words in a package by level
    async findWordsByLevel(package_id, levelGame) {
        try { 
            const intervalDate = this.getInterval(levelGame);
            const [rows] = await global.dbConnection.execute(
                `SELECT detail_id
                 FROM learning
                 WHERE package_id = ?
                   AND level = ?
                   AND DATE_ADD(DATE(date_memorized), INTERVAL ? DAY) <= CURDATE()`,
                [package_id, levelGame, intervalDate]
            );
            return rows;
        } catch (error) {
            console.error("Erreur lors de la récupération des mots par niveau :", error);
            throw error;
        }
    }
    // function to get the number of words in a package by level
    async countUserWordsByLevel(package_id, level) {
        try {
            const intervalDate = this.getInterval(level);
            const [rows] = await global.dbConnection.execute(
                `SELECT COUNT(*) AS num_words
                 FROM learning
                 WHERE package_id = ? AND level = ?
                 AND DATE_ADD(DATE(date_memorized), INTERVAL ? DAY) <= CURDATE()`,
                [package_id, level, intervalDate]
            );
            return rows[0].num_words;
        } catch (error) {
            console.error("Erreur lors de la récupération du nombre de mots par niveau :", error);
            throw error;
        }
    }

    // Récupérer des mots aléatoires en excluant un mot spécifique
    async findRandomWordsExcluding(package_id, excludeDetailId, limit = 1, levelGame) {
        try {
            // Convertir explicitement les paramètres en entiers
            const limitInt = parseInt(limit, 10);
            const intervalDate = this.getInterval(levelGame)

            let query;
            let params;
            
            if (excludeDetailId) {
                // Requête avec exclusion d'un mot spécifique
                query = 'SELECT wd.detail_id, w.word_id, w.word, wd.meaning, wd.example, wd.pronunciation ' +
                        'FROM words w ' +
                        'JOIN word_details wd ON w.word_id = wd.word_id ' +
                        'JOIN learning ln ON wd.detail_id = ln.detail_id ' +
                        'WHERE ln.package_id = ? AND wd.detail_id != ? AND ln.level = ? ' +
                        'AND DATE_ADD(DATE(ln.date_memorized), INTERVAL ? DAY) <= CURDATE()'+
                        'ORDER BY RAND() LIMIT 1';
                params = [package_id, excludeDetailId, levelGame, intervalDate];
            } else {
                // Requête sans exclusion
                query = 'SELECT wd.detail_id,w.word_id, w.word, wd.meaning, wd.example, wd.pronunciation ' +
                        'FROM words w ' +
                        'JOIN word_details wd ON w.word_id = wd.word_id ' +
                        'JOIN learning ln ON wd.detail_id = ln.detail_id ' +
                        'WHERE ln.package_id = ? AND ln.level = ? ' +
                        'AND DATE_ADD(DATE(ln.date_memorized), INTERVAL ? DAY) <= CURDATE()'+
                        'ORDER BY RAND() LIMIT 1';
                params = [package_id, levelGame, intervalDate];
            }
            
            const [words] = await global.dbConnection.execute(query, params);
            
            return words;
        } catch (error) {
            console.error('Error in findRandomWordsExcluding:', error);
            throw error;
        }
    }


    // Récupérer plusieurs mots aléatoires pour le jeu Word Search
    async getRandomUserWords(package_id, limit = 5, levelGame) {
        try {
            // Convertir explicitement les paramètres en entiers
            const limitInt = parseInt(limit, 10);
            const intervalDate = this.getInterval(levelGame);

            const query = `SELECT wd.detail_id, w.word_id, w.word, wd.meaning 
                    FROM words w 
                    JOIN word_details wd ON w.word_id = wd.word_id
                    JOIN learning ln ON wd.detail_id = ln.detail_id 
                    WHERE ln.package_id = ? AND ln.level = ? 
                    AND DATE_ADD(DATE(ln.date_memorized), INTERVAL ? DAY) <= CURDATE()
                    AND LENGTH(w.word) < 14 
                    ORDER BY RAND() LIMIT ${limitInt}`;
            
            const [words] = await global.dbConnection.execute(query, [package_id, levelGame, intervalDate]);
            
            return words;
        } catch (error) {
            console.error('Error in getRandomUserWords:', error);
            throw error;
        }
    }
}
module.exports = new Learning();