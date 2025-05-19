const gameScoresModel = require('../../models/game_scores');
const wordModel = require('../../models/words');
const learningModel = require('../../models/learning');
const levelGame = '1';

class SpeedVocabController {
    constructor() {
        // Bind all methods to maintain 'this' context
        this.getWordForSpeedVocab = this.getWordForSpeedVocab.bind(this);
    }

    async getWordForSpeedVocab(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.status(401).json({ error: 'Vous devez être connecté pour jouer.' });
            }
        
            const previousWordId = req.query.previous || null; // Récupérer l'ID du mot précédent
            
            // Récupérer le nombre de mots disponibles pour l'utilisateur
            const wordCount = await learningModel.countUserWordsByLevel(req.session.user.id, levelGame);
            
            if (wordCount === 0) {
                return res.status(404).json({ error: 'Vous n\'avez pas encore de mots dans votre vocabulaire.' });
            }
               
            const words = await wordModel.findRandomWordsExcluding(
                req.session.user.id, 
                previousWordId, 
                1,
                levelGame
            );
                
            if (!words || words.length === 0) {
                return res.status(404).json({ error: 'Aucun mot trouvé dans votre vocabulaire.' });
            }

            return res.json(words[0]);
            
        } catch (error) {
            console.error('Erreur lors de la récupération du mot pour SpeedVocab:', error);
            res.status(500).json({ error: 'Erreur lors de la récupération du mot.' });
        }
    }
}

module.exports = new SpeedVocabController();

