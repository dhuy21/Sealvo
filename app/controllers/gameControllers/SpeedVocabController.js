const gameScoresModel = require('../../models/game_scores');
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
            const package_id = req.query.package;
            const previousWordId = req.query.previous || null; // Récupérer l'ID du mot précédent
            
            const words = await learningModel.findRandomWordsExcluding(
                package_id, 
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

