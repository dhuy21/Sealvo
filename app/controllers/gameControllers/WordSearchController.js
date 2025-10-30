const gameScoresModel = require('../../models/game_scores');
const wordModel = require('../../models/words');
const learningModel = require('../../models/learning');
const levelGame = '2';

class WordSearchController {
    constructor() {
        // Bind all methods to maintain 'this' context
        this.getWordsForGame = this.getWordsForGame.bind(this);
    }

    async getWordsForGame(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.status(401).json({ error: 'Vous devez être connecté pour jouer.' });
            }
            
            // Déterminer le nombre de mots à récupérer en fonction de la difficulté
            const wordCount = 30;
            const gridSize = 15;
            const package_id = req.query.package;
            // Récupérer des mots aléatoires du vocabulaire de l'utilisateur
            const words = await learningModel.getRandomUserWords(package_id, wordCount, levelGame);
            
            if (!words || words.length === 0) {
                return res.status(404).json({ error: 'Aucun mot trouvé dans votre vocabulaire.' });
            }
            
            // Formater les données de sortie
            const wordList = words.map(word => ({
                id: word.word_id,
                detail_id: word.detail_id,
                word: word.word,
                meaning: word.meaning
            }));
            
            return res.json({
                words: wordList,
                gridSize: gridSize,
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des mots pour le jeu:', error);
            res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des mots pour le jeu.' });
        }
    }
}

module.exports = new WordSearchController();