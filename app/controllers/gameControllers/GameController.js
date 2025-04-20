const gameScoresModel = require('../../models/game_scores');
const wordModel = require('../../models/words');

class GameController {
    /**
     * Affiche la page d'accueil des jeux
     */
    async index(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.redirect('/login?error=Vous devez être connecté pour accéder aux jeux');
            }
            
            // Récupérer les statistiques de jeu de l'utilisateur
            const stats = await gameScoresModel.getUserGameStats(req.session.user.id);
            
            return res.render('games/index', {
                title: 'Jeux éducatifs - VocabMaster',
                user: req.session.user,
                stats: stats
            });
        } catch (error) {
            console.error('Erreur lors du chargement de la page des jeux:', error);
            return res.status(500).render('error', {
                title: 'Erreur',
                message: 'Une erreur est survenue lors du chargement de la page des jeux.',
                error: process.env.NODE_ENV === 'development' ? error : {}
            });
        }
    }
    
    /**
     * Affiche la page d'un jeu spécifique
     */
    async showGame(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.redirect('/login?error=Vous devez être connecté pour accéder aux jeux');
            }
            
            const gameType = req.params.gameType;
            
            // Vérifier si le type de jeu est valide
            const validGames = ['wordScramble', 'flashMatch', 'speedVocab', 'vocabQuiz', 'phraseCompletion', 'wordSearch'];
            if (!validGames.includes(gameType)) {
                return res.redirect('/games?error=Type de jeu invalide');
            }
            
            // Convertir le format camelCase en format snake_case pour la base de données
            const dbGameType = gameType.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
            
            // Récupérer le meilleur score de l'utilisateur pour ce jeu
            const highScore = await gameScoresModel.getHighScore(req.session.user.id, dbGameType);
            
            // Récupérer le classement pour ce jeu
            const leaderboard = await gameScoresModel.getLeaderboard(dbGameType, 5);
            
            // Nombre de mots dans le vocabulaire de l'utilisateur
            console.log('User ID from session:', req.session.user.id, 'Type:', typeof req.session.user.id);
            
            let wordCount = 0;
            try {
                wordCount = await wordModel.countUserWords(req.session.user.id);
                console.log(`Retrieved word count: ${wordCount}`);
            } catch (countError) {
                console.error('Error counting user words:', countError);
                // Continue with word count as 0
            }
            
            // Vérifier si l'utilisateur a suffisamment de mots pour jouer
            let minWordsRequired = 5;
            if (gameType === 'flashMatch') minWordsRequired = 4;
            
            let errorMessage = null;
            if (wordCount < minWordsRequired) {
                errorMessage = `Vous devez avoir au moins ${minWordsRequired} mots dans votre vocabulaire pour jouer à ce jeu.`;
            }
            
            // Récupérer le titre et la description du jeu
            const gameTitles = {
                'wordScramble': 'Mots Mélangés',
                'flashMatch': 'Memory Match',
                'speedVocab': 'Vitesse Vocab',
                'vocabQuiz': 'Quiz de Vocabulaire',
                'phraseCompletion': 'Complétion de Phrase',
                'wordSearch': 'Mots Cachés'
                
            };
            
            const gameDescriptions = {
                'wordScramble': 'Retrouvez les mots dont les lettres ont été mélangées.',
                'flashMatch': 'Associez les mots à leurs définitions dans ce jeu de mémoire.',
                'speedVocab': 'Tapez les mots qui s\'affichent le plus rapidement possible.',
                'vocabQuiz': 'Testez vos connaissances avec ce quiz de vocabulaire.',
                'phraseCompletion': 'Complétez les phrases avec les mots appropriés.',
                'wordSearch': 'Trouvez les mots cachés dans la grille.'
            };
            
            return res.render(`games/${gameType}`, {
                title: `${gameTitles[gameType]} - VocabMaster`,
                user: req.session.user,
                highScore: highScore,
                leaderboard: leaderboard,
                wordCount: wordCount,
                errorMessage: errorMessage,
                gameTitle: gameTitles[gameType],
                gameDescription: gameDescriptions[gameType]
            });
        } catch (error) {
            console.error(`Erreur lors du chargement du jeu ${req.params.gameType}:`, error);
            return res.status(500).render('error', {
                title: 'Erreur',
                message: 'Une erreur est survenue lors du chargement du jeu.',
                error: process.env.NODE_ENV === 'development' ? error : {}
            });
        }
    }
    
    /**
     * Enregistre un score
     */
    async saveScore(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.status(401).json({ error: 'Vous devez être connecté pour enregistrer un score' });
            }
            
            const { game_type, score, details } = req.body;
            
            // Vérifier si le type de jeu est valide
            const validGames = ['word_scramble', 'flash_match', 'speed_vocab', 'vocab_quiz', 'phrase_completion', 'word_search'];
            if (!validGames.includes(game_type)) {
                return res.status(400).json({ error: 'Type de jeu invalide' });
            }
            
            // Enregistrer le score
            const scoreId = await gameScoresModel.saveScore(
                req.session.user.id,
                game_type,
                score,
                details || {}
            );
            
            // Récupérer les statistiques mises à jour
            const stats = await gameScoresModel.getUserGameStats(req.session.user.id);
            
            return res.json({
                success: true,
                score_id: scoreId,
                stats: stats[game_type]
            });
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement du score:', error);
            return res.status(500).json({
                error: 'Une erreur est survenue lors de l\'enregistrement du score.'
            });
        }
    }
    
    /**
     * Affiche le classement d'un jeu
     */

}

module.exports = new GameController();