const gameScoresModel = require('../../models/game_scores');
const wordModel = require('../../models/words');

class WordSearchController {
    constructor() {
        // Bind all methods to maintain 'this' context
        this.index = this.index.bind(this);
        this.getWordsForGame = this.getWordsForGame.bind(this);
    }

    async index(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.redirect('/login?error=Vous devez être connecté pour accéder à cette page');
            }
            
            // Récupérer le meilleur score de l'utilisateur pour ce jeu
            const highScore = await gameScoresModel.getHighScore(req.session.user.id, 'word_search');
            
            // Récupérer le classement pour ce jeu
            const leaderboard = await gameScoresModel.getLeaderboard('word_search', 5);
            
            // Nombre de mots dans le vocabulaire de l'utilisateur
            const wordCount = await wordModel.countUserWords(req.session.user.id);
            
            // Vérifier si l'utilisateur a suffisamment de mots pour jouer
            const minWordsRequired = 5;
            let errorMessage = null;
            if (wordCount < minWordsRequired) {
                errorMessage = `Vous devez avoir au moins ${minWordsRequired} mots dans votre vocabulaire pour jouer à ce jeu.`;
            }
            
            res.render('games/wordSearch', {
                title: 'Mots Cachés - VocabMaster',
                user: req.session.user,
                highScore: highScore,
                leaderboard: leaderboard,
                wordCount: wordCount,
                errorMessage: errorMessage,
                gameTitle: 'Mots Cachés',
                gameDescription: 'Trouvez vos mots de vocabulaire cachés dans une grille de lettres. Les mots peuvent être placés horizontalement, verticalement ou en diagonale.'
            });
        } catch (error) {
            console.error('Erreur lors du chargement du jeu Mots Cachés:', error);
            res.render('error', {
                title: 'Erreur',
                message: 'Une erreur est survenue lors du chargement du jeu Mots Cachés.',
                error: process.env.NODE_ENV === 'development' ? error : {}
            });
        }
    }

    async getWordsForGame(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.status(401).json({ error: 'Vous devez être connecté pour jouer.' });
            }
            
            const difficulty = req.query.difficulty || 'easy';
            
            // Déterminer le nombre de mots à récupérer en fonction de la difficulté
            let wordCount = 5;
            let gridSize = 8;
            
            switch (difficulty) {
                case 'easy':
                    wordCount = 8;
                    gridSize = 30;
                    break;
                case 'medium':
                    wordCount = 10;
                    gridSize = 30;
                    break;
                case 'hard':
                    wordCount = 25;
                    gridSize = 30;
                    break;
            }
            
            // Récupérer des mots aléatoires du vocabulaire de l'utilisateur
            const words = await wordModel.getRandomUserWords(req.session.user.id, wordCount);
            
            if (!words || words.length === 0) {
                return res.status(404).json({ error: 'Aucun mot trouvé dans votre vocabulaire.' });
            }
            
            // Formater les données de sortie
            const wordList = words.map(word => ({
                id: word.word_id,
                word: word.word,
                meaning: word.meaning
            }));
            
            return res.json({
                words: wordList,
                gridSize: gridSize,
                difficulty: difficulty
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des mots pour le jeu:', error);
            res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des mots pour le jeu.' });
        }
    }
}

module.exports = new WordSearchController();