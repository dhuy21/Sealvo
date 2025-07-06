const gameScoresModel = require('../../models/game_scores');
const wordModel = require('../../models/words');
const learningModel = require('../../models/learning');
const levelGame = 'x';

class TestPronunController {


    async getWordForTestPronun(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.status(401).json({ error: 'Vous devez être connecté pour jouer.' });
            }
            const package_id = req.query.package;
            const previousWordId = req.query.previous || null; // Récupérer l'ID du mot précédent

            // Récupérer des mots aléatoires du vocabulaire de l'utilisateur
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
            console.error('Erreur lors de la récupération des mots pour le jeu:', error);
            return res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des mots pour le jeu.' });
        }
    }

}

module.exports = new TestPronunController();