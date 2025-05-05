class GameScores {
    /**
     * Enregistre un nouveau score pour un utilisateur dans un jeu
     * @param {number} user_id - L'ID de l'utilisateur
     * @param {string} game_type - Le type de jeu (word_scramble, flash_match, speed_vocab, vocab_quiz)
     * @param {number} score - Le score obtenu
     * @param {Object} details - Détails supplémentaires sur la partie (optionnel)
     * @returns {Promise<number>} L'ID du score enregistré
     */
    async saveScore(user_id, game_type, score, details = {}) {
        try {
            // Vérifier si c'est un record personnel
            const currentHighScore = await this.getHighScore(user_id, game_type);
            const isHighScore = !currentHighScore || score > currentHighScore.score;
            
            // Enregistrer le score
            const [result] = await global.dbConnection.execute(
                `INSERT INTO game_scores (user_id, game_type, score, details, is_high_score, created_at) 
                 VALUES (?, ?, ?, ?, ?, NOW())`,
                [user_id, game_type, score, JSON.stringify(details), isHighScore ? 1 : 0]
            );
            
            // Si c'est un nouveau record, mettre à jour tous les anciens records
            if (isHighScore && currentHighScore) {
                await global.dbConnection.execute(
                    `UPDATE game_scores SET is_high_score = 0 
                     WHERE user_id = ? AND game_type = ? AND id != ?`,
                    [user_id, game_type, result.insertId]
                );
            }
            
            return result.insertId;
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement du score:', error);
            throw error;
        }
    }
    
    /**
     * Récupère le meilleur score d'un utilisateur pour un type de jeu
     * @param {number} user_id - L'ID de l'utilisateur
     * @param {string} game_type - Le type de jeu
     * @returns {Promise<Object|null>} Le meilleur score ou null
     */
    async getHighScore(user_id, game_type) {
        try {
            const [rows] = await global.dbConnection.execute(
                `SELECT * FROM game_scores 
                 WHERE user_id = ? AND game_type = ? AND is_high_score = 1
                 LIMIT 1`,
                [user_id, game_type]
            );
            
            if (rows.length === 0) {
                return null;
            }
            
            // Convertir les détails JSON en objet
            if (rows[0].details) {
                rows[0].details = JSON.parse(rows[0].details);
            }
            
            return rows[0];
        } catch (error) {
            console.error('Erreur lors de la récupération du meilleur score:', error);
            throw error;
        }
    }
    
    /**
     * Récupère l'historique des scores d'un utilisateur pour un type de jeu
     * @param {number} user_id - L'ID de l'utilisateur
     * @param {string} game_type - Le type de jeu (optionnel, tous les jeux si non spécifié)
     * @param {number} limit - Nombre maximum de scores à récupérer
     * @returns {Promise<Array>} Liste des scores
     */
    async getScoreHistory(user_id, game_type = null, limit = 10) {
        try {
            // Convertir limit en nombre entier pour éviter les problèmes avec LIMIT
            limit = parseInt(limit);
            
            let query, params;
            
            if (game_type) {
                query = `SELECT * FROM game_scores 
                         WHERE user_id = ? AND game_type = ? 
                         ORDER BY created_at DESC LIMIT ${limit}`;
                params = [user_id, game_type];
            } else {
                query = `SELECT * FROM game_scores 
                         WHERE user_id = ? 
                         ORDER BY created_at DESC LIMIT ${limit}`;
                params = [user_id];
            }
            
            const [rows] = await global.dbConnection.execute(query, params);
            
            // Convertir les détails JSON en objets
            for (const row of rows) {
                if (row.details) {
                    row.details = JSON.parse(row.details);
                }
            }
            
            return rows;
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'historique des scores:', error);
            throw error;
        }
    }
    
    /**
     * Récupère les meilleurs scores de tous les utilisateurs pour un type de jeu
     * @param {string} game_type - Le type de jeu
     * @param {number} limit - Nombre maximum de scores à récupérer
     * @returns {Promise<Array>} Liste des meilleurs scores
     */
    async getLeaderboard(game_type, limit = 10) {
        try {
            // Convertir limit en nombre entier pour éviter les problèmes avec LIMIT
            limit = parseInt(limit);
            
            // Avec MySQL, on ne peut pas utiliser ? pour LIMIT dans les requêtes préparées
            // On va donc intégrer directement la valeur dans la requête
            const query = `SELECT gs.*, u.username 
                 FROM game_scores gs
                 JOIN users u ON gs.user_id = u.id
                 WHERE gs.game_type = ? AND gs.is_high_score = 1
                 ORDER BY gs.score DESC
                 LIMIT ${limit}`;
                 
            const [rows] = await global.dbConnection.execute(query, [game_type]);
            
            // Convertir les détails JSON en objets
            for (const row of rows) {
                if (row.details) {
                    row.details = JSON.parse(row.details);
                }
            }
            
            return rows;
        } catch (error) {
            console.error('Erreur lors de la récupération du classement:', error);
            throw error;
        }
    }
    
    /**
     * Récupère des statistiques sur les jeux d'un utilisateur
     * @param {number} user_id - L'ID de l'utilisateur
     * @returns {Promise<Object>} Statistiques des jeux
     */
    async getUserGameStats(user_id) {
        try {
            // Récupérer le nombre total de parties jouées par type de jeu
            const [gameCounts] = await global.dbConnection.execute(
                `SELECT game_type, COUNT(*) as play_count 
                 FROM game_scores
                 WHERE user_id = ?
                 GROUP BY game_type`,
                [user_id]
            );
            
            // Récupérer les meilleurs scores pour chaque type de jeu
            const [highScores] = await global.dbConnection.execute(
                `SELECT game_type, MAX(score) as high_score
                 FROM game_scores
                 WHERE user_id = ?
                 GROUP BY game_type`,
                [user_id]
            );
            
            // Récupérer la date de la dernière partie jouée
            const [lastPlayed] = await global.dbConnection.execute(
                `SELECT game_type, MAX(created_at) as last_played
                 FROM game_scores
                 WHERE user_id = ?
                 GROUP BY game_type`,
                [user_id]
            );
            
            // Combiner les résultats
            const stats = {};
            
            // Initialiser les types de jeux
            const gameTypes = ['word_scramble', 'flash_match', 'speed_vocab', 'vocab_quiz', 'phrase_completion', 'word_search'];
            for (const type of gameTypes) {
                stats[type] = {
                    play_count: 0,
                    high_score: 0,
                    last_played: null
                };
            }
            
            // Ajouter les nombres de parties
            for (const count of gameCounts) {
                stats[count.game_type].play_count = count.play_count;
            }
            
            // Ajouter les meilleurs scores
            for (const score of highScores) {
                stats[score.game_type].high_score = score.high_score;
            }
            
            // Ajouter les dates de dernières parties
            for (const played of lastPlayed) {
                stats[played.game_type].last_played = played.last_played;
            }
            
            return stats;
        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques des jeux:', error);
            throw error;
        }
    }
}

module.exports = new GameScores();