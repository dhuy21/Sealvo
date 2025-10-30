const gameScoresModel = require('../../models/game_scores');
const learningModel = require('../../models/learning');
const wordModel = require('../../models/words');
const levelGame = '1';

class SpeedVocabController {
    constructor() {
        // Bind all methods to maintain 'this' context
        this.getWordsForSpeedVocab = this.getWordsForSpeedVocab.bind(this);
    }

    async getWordsForSpeedVocab(req, res) {
        try {
            const package_id = req.query.package;

            // Récupérer tous les mots de l'utilisateur
            const detailWordsIds = await learningModel.findWordsByLevel(package_id, levelGame);
            let words = [];
            for (const detailWordId of detailWordsIds) {
                let word = await wordModel.findById(detailWordId.detail_id);

                // Construire une définition à partir des détails du mot
                let meaning = '';
                if (word.type) {
                    meaning += `${word.type} : `;
                }
                meaning += word.meaning;

                words.push({
                    word: word.word,
                    meaning: meaning
                });
            }
            
            return res.json({
                words: words
            });

        } catch (error) {
            console.error('Erreur lors de la récupération d\'un mot aléatoire:', error);
            return res.status(500).json({ error: 'Une erreur est survenue lors de la récupération d\'un mot.' });
        }
    }
}

module.exports = new SpeedVocabController();

