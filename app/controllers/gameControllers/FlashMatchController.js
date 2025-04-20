const gameScoresModel = require('../../models/game_scores');
const wordModel = require('../../models/words');

class FlashMatchController {
    constructor() {
        // Bind all methods to maintain 'this' context
        this.getCardsForFlashMatch = this.getCardsForFlashMatch.bind(this);
    }

    async index(req, res) {
        res.render('games/flashMatch', {
            title: 'Flash Match',
            user: req.session.user
        });
    }

    async getCardsForFlashMatch(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.status(401).json({ error: 'Vous devez être connecté pour jouer.' });
            }
            
            const { difficulty } = req.query;
            
            // Déterminer le nombre de paires en fonction de la difficulté
            let pairsCount = 4; // Par défaut: facile
            if (difficulty === 'medium') {
                pairsCount = 6;
            } else if (difficulty === 'hard') {
                pairsCount = 8;
            }
            
            // Récupérer tous les mots de l'utilisateur
            const words = await wordModel.findWordsByUserId(req.session.user.id);
            
            if (words.length < pairsCount) {
                return res.status(404).json({ 
                    error: `Vous devez avoir au moins ${pairsCount} mots dans votre vocabulaire pour jouer à ce niveau de difficulté.` 
                });
            }
            
            // Mélanger les mots et sélectionner le nombre de paires requis
            const shuffledWords = this.shuffleArray([...words]);
            const selectedWords = shuffledWords.slice(0, pairsCount);
            
            // Créer les cartes
            const cards = [];
            selectedWords.forEach((word, index) => {
                // Carte du mot
                cards.push({
                    pairId: index,
                    type: 'word',
                    content: word.word
                });
                
                // Carte de la définition
                let meaning = '';
                if (word.type) {
                    meaning += `${word.type} : `;
                }
                meaning += word.meaning;
                
                cards.push({
                    pairId: index,
                    type: 'meaning',
                    content: meaning
                });
            });
            
            return res.json({
                cards: cards
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des cartes:', error);
            return res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des cartes.' });
        }
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

}

module.exports = new FlashMatchController();
