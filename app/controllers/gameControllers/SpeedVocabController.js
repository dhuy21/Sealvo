const gameScoresModel = require('../../models/game_scores');
const wordModel = require('../../models/words');

class SpeedVocabController {
    constructor() {
        // Bind all methods to maintain 'this' context
        this.getWordForSpeedVocab = this.getWordForSpeedVocab.bind(this);
    }

    async index(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.redirect('/login?error=Vous devez être connecté pour accéder à cette page');
            }
            
            // Récupérer le meilleur score de l'utilisateur pour ce jeu
            const highScore = await gameScoresModel.getHighScore(req.session.user.id, 'speed_vocab');
            
            // Récupérer le classement pour ce jeu
            const leaderboard = await gameScoresModel.getLeaderboard('speed_vocab', 5);
            
            // Nombre de mots dans le vocabulaire de l'utilisateur
            const wordCount = await wordModel.countUserWords(req.session.user.id);
            
            // Vérifier si l'utilisateur a suffisamment de mots pour jouer
            const minWordsRequired = 5;
            let errorMessage = null;
            if (wordCount < minWordsRequired) {
                errorMessage = `Vous devez avoir au moins ${minWordsRequired} mots dans votre vocabulaire pour jouer à ce jeu.`;
            }
            
            res.render('games/speedVocab', {
                title: 'Speed Vocab - VocabMaster',
                user: req.session.user,
                highScore: highScore,
                leaderboard: leaderboard,
                wordCount: wordCount,
                errorMessage: errorMessage,
                gameTitle: 'Vitesse Vocab',
                gameDescription: 'Tapez les mots qui s\'affichent le plus rapidement possible.'
            });
        } catch (error) {
            console.error('Erreur lors du chargement du jeu Speed Vocab:', error);
            res.render('error', {
                title: 'Erreur',
                message: 'Une erreur est survenue lors du chargement du jeu Speed Vocab.',
                error: process.env.NODE_ENV === 'development' ? error : {}
            });
        }
    }

    async getWordForSpeedVocab(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.status(401).json({ error: 'Vous devez être connecté pour jouer.' });
            }
            
            const difficulty = req.query.difficulty || 'easy';
            const previousWordId = req.query.previous || null; // Récupérer l'ID du mot précédent
            
            // Récupérer le nombre de mots disponibles pour l'utilisateur
            const wordCount = await wordModel.countUserWords(req.session.user.id);
            
            if (wordCount === 0) {
                return res.status(404).json({ error: 'Vous n\'avez pas encore de mots dans votre vocabulaire.' });
            }
            
            // Définir les critères de longueur en fonction de la difficulté
            let minLength = 0;
            let maxLength = 100;
            
            switch (difficulty) {
                case 'easy':
                    maxLength = 5; // Mots courts (5 lettres ou moins)
                    break;
                case 'medium':
                    minLength = 6; 
                    maxLength = 8; // Mots moyens (6-8 lettres)
                    break;
                case 'hard':
                    minLength = 9; // Mots longs (9 lettres ou plus)
                    break;
            }
            
            // Récupérer un mot aléatoire correspondant aux critères, en excluant le mot précédent
            const words = await wordModel.findRandomWordsByLengthExcluding(
                req.session.user.id, 
                minLength, 
                maxLength, 
                previousWordId, 
                1
            );
            
            if (!words || words.length === 0) {
                // Si aucun mot ne correspond aux critères de difficulté, récupérer n'importe quel mot sauf le précédent
                const fallbackWords = await wordModel.findRandomWordsExcluding(
                    req.session.user.id, 
                    previousWordId, 
                    1
                );
                
                if (!fallbackWords || fallbackWords.length === 0) {
                    return res.status(404).json({ error: 'Aucun mot trouvé dans votre vocabulaire.' });
                }
                
                return res.json(fallbackWords[0]);
            }
            
            res.json(words[0]);
        } catch (error) {
            console.error('Erreur lors de la récupération du mot pour SpeedVocab:', error);
            res.status(500).json({ error: 'Erreur lors de la récupération du mot.' });
        }
    }
}

module.exports = new SpeedVocabController();

