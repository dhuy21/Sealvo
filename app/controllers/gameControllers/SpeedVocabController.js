const gameScoresModel = require('../../models/game_scores');

class SpeedVocabController {
    constructor() {
        // Bind all methods to maintain 'this' context
        this.getWordForSpeedVocab = this.getWordForSpeedVocab.bind(this);
    }

    async index(req, res) {
        res.render('games/speed-vocab', {
            title: 'Speed Vocab',
            user: req.session.user
        });
    }

    async getWordForSpeedVocab(req, res) {
        try {
            const difficulty = req.query.difficulty || 'easy';
            
            // Vérifier si l'utilisateur est connecté
            if (!req.user || !req.user.id) {
                return res.status(401).json({ error: 'Vous devez être connecté pour jouer.' });
            }

            // Récupérer le nombre de mots disponibles pour l'utilisateur
            const wordCount = await wordModel.countUserWords(req.user.id);
            
            if (wordCount === 0) {
                return res.status(404).json({ error: 'Vous n\'avez pas encore de mots dans votre vocabulaire.' });
            }
            
            // Définir les critères de longueur en fonction de la difficulté
            let lengthCriteria = {};
            
            switch (difficulty) {
                case 'easy':
                    lengthCriteria = { maxLength: 5 }; // Mots courts (5 lettres ou moins)
                    break;
                case 'medium':
                    lengthCriteria = { minLength: 6, maxLength: 8 }; // Mots moyens (6-8 lettres)
                    break;
                case 'hard':
                    lengthCriteria = { minLength: 9 }; // Mots longs (9 lettres ou plus)
                    break;
                default:
                    lengthCriteria = {}; // Aucune restriction
            }
            
            // Récupérer un mot aléatoire en fonction de la difficulté
            const words = await global.dbConnection.execute(`
                SELECT l.word, l.meaning 
                FROM learning l
                WHERE l.user_id = ? 
                ${lengthCriteria.minLength ? `AND LENGTH(l.word) >= ${lengthCriteria.minLength}` : ''}
                ${lengthCriteria.maxLength ? `AND LENGTH(l.word) <= ${lengthCriteria.maxLength}` : ''}
                ORDER BY RAND() 
                LIMIT 1
            `, [req.user.id]);
            
            if (!words || words.length === 0) {
                // Si aucun mot ne correspond aux critères de difficulté, récupérer n'importe quel mot
                const fallbackWords = await global.dbConnection.execute(`
                    SELECT l.word, l.meaning 
                    FROM learning l
                    WHERE l.user_id = ? 
                    ORDER BY RAND() 
                    LIMIT 1
                `, [req.user.id]);
                
                if (!fallbackWords || fallbackWords.length === 0) {
                    return res.status(404).json({ error: 'Aucun mot trouvé dans votre vocabulaire.' });
                }
                
                return res.json({ 
                    word: fallbackWords[0].word,
                    meaning: fallbackWords[0].meaning
                });
            }
            
            res.json({ 
                word: words[0].word,
                meaning: words[0].meaning
            });
            
        } catch (error) {
            console.error('Erreur lors de la récupération du mot pour SpeedVocab:', error);
            res.status(500).json({ error: 'Erreur lors de la récupération du mot.' });
        }
    }

}

module.exports = new SpeedVocabController();

