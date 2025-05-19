const gameScoresModel = require('../../models/game_scores');
const wordModel = require('../../models/words');
const learningModel = require('../../models/learning');
const levelGame = 'x';

class FlashMatchController {
    constructor() {
        // Bind all methods to maintain 'this' context
        this.getCardsForFlashMatch = this.getCardsForFlashMatch.bind(this);
    }

    async getCardsForFlashMatch(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.status(401).json({ error: 'Vous devez être connecté pour jouer.' });
            }
            
            // Déterminer le nombre de paires en fonction de la difficulté
            let pairsCount = 15; // Par défaut
            
            const minPairsCount = 4; // Par défaut
            const maxPairsCount = 15; // Par défaut
            
            // Récupérer tous les mots de l'utilisateur
            const wordIds = await learningModel.findWordsByLevel(req.session.user.id, levelGame);
            let words = [];
            for (const wordId of wordIds) {
                const word = await wordModel.findById(wordId.word_id);
                words.push(word);
            }
            
            if (words.length < minPairsCount) {
                return res.status(404).json({ 
                    error: `Vous devez avoir au moins ${minPairsCount} mots au niveau ${levelGame} dans votre vocabulaire pour jouer à ce niveau de difficulté.` 
                });
            } 

            if (words.length < maxPairsCount) {
                pairsCount = words.length;
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
            
            // Extract word IDs for tracking progress
            const wordIdsForUpdate = selectedWords.map(word => word.id);
            
            return res.json({
                cards: cards,
                wordIds: wordIdsForUpdate
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
