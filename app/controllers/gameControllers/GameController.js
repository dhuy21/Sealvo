const gameScoresModel = require('../../models/game_scores');
const wordModel = require('../../models/words');
const learningModel = require('../../models/learning');

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
                title: 'Jeux éducatifs',
                user: req.session.user,
                stats: stats,
                package_id: req.query.package
            });
        } catch (error) {
            console.error('Erreur lors du chargement de la page des jeux:', error);
            return res.status(500).render('error', {
                title: 'Erreur',
                package_id: req.query.package,
                message: 'Une erreur est survenue lors du chargement de la page des jeux.',
                error: process.env.NODE_ENV === 'development' ? error : {}
            });
        }
    }
    
    /**
     * Affiche la page d'un jeu spécifique
     */
    async showGame(req, res) {
        const package_id = req.query.package;
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.redirect('/login?error=Vous devez être connecté pour accéder aux jeux');
            }
                        
            const gameType = req.params.gameType;
            
            // Vérifier si le type de jeu est valide
            const validGames = ['wordScramble', 'flashMatch', 'speedVocab', 'vocabQuiz', 'phraseCompletion', 'wordSearch', 'testPronun'];
            if (!validGames.includes(gameType)) {
                return res.redirect(`/games?package=${package_id}&error=Type de jeu invalide`);
            }
            
            // Convertir le format camelCase en format snake_case pour la base de données
            const dbGameType = gameType.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
            
            // Récupérer le meilleur score de l'utilisateur pour ce jeu
            const highScore = await gameScoresModel.getHighScore(req.session.user.id, dbGameType);
            
            // Récupérer le classement pour ce jeu
            const leaderboard = await gameScoresModel.getLeaderboard(dbGameType, 5);
            
            // Nombre de mots dans le vocabulaire de l'utilisateur
            const levelGame = {
                'flashMatch': 'x',
                'vocabQuiz': 'x',
                'testPronun': 'x',
                'wordSearch': '2',
                'phraseCompletion': '0',
                'speedVocab': '1',
                'wordScramble': '0'
            }

            let wordCount = 0;
            let WordCountlevel = 0;
            
            try {
                wordCount = await learningModel.countUserWordsByLevel(package_id, levelGame[gameType]);
                WordCountlevel = await learningModel.getNumWordsByLevel(package_id, levelGame[gameType]);
            } catch (countError) {
                console.error('Error counting user words:', countError);
                // Continue with word count as 0
            }
            
            // Vérifier si l'utilisateur a suffisamment de mots pour jouer
            let minWordsRequired = 5;
            if (gameType === 'flashMatch') minWordsRequired = 6;
            
            let errorMessage = null;

            if (wordCount < minWordsRequired || WordCountlevel == 0) {
                errorMessage = `Vous devez avoir au moins ${minWordsRequired} mots au niveau ${levelGame[gameType]} dans votre vocabulaire pour jouer à ce jeu.`;
            }else if (WordCountlevel !== 0 && wordCount == 0) {
                errorMessage = `Aujourd'hui, vous n'avez pas de mots à apprendre pour niveau ${levelGame[gameType]}. Si vous voulez jouer à ce jeu, veuillez ajouter des mots à votre vocabulaire.`;
            }
            
            // Récupérer le titre et la description du jeu
            const gameTitles = {
                'wordScramble': 'Mots Mélangés',
                'flashMatch': 'Memory Match',
                'speedVocab': 'Vitesse Vocab',
                'vocabQuiz': 'Quiz de Vocabulaire',
                'phraseCompletion': 'Complétion de Phrase',
                'wordSearch': 'Mots Cachés',
                'testPronun': 'Défi Prononcial'
                
            };
            
            const gameDescriptions = {
                'wordScramble': 'Retrouvez les mots dont les lettres ont été mélangées.',
                'flashMatch': 'Associez les mots à leurs définitions.',
                'speedVocab': 'Tapez les mots qui s\'affichent le plus rapidement possible.',
                'vocabQuiz': 'Testez vos connaissances avec ce quiz de vocabulaire.',
                'phraseCompletion': 'Complétez les phrases avec les mots appropriés.',
                'wordSearch': 'Trouvez les mots cachés dans la grille.',
                'testPronun': 'Essayez de prononcer les mots correctement.'
            };
            
            return res.render(`games/${gameType}`, {
                title: `${gameTitles[gameType]}`,
                package_id: package_id,
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
                package_id: package_id,
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
            const validGames = ['word_scramble', 'flash_match', 'speed_vocab', 'vocab_quiz', 'phrase_completion', 'word_search', 'test_pronun'];
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