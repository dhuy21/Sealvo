const gameScoresModel = require('../../models/game_scores');
const learningModel = require('../../models/learning');
const levelGame = '0';

class PhraseCompletionController {
    constructor() {
        // Bind all methods to maintain 'this' context

        this.getPhraseForCompletion = this.getPhraseForCompletion.bind(this);
        this.checkPhraseAnswer = this.checkPhraseAnswer.bind(this);
        this.getAvailableWordsCount = this.getAvailableWordsCount.bind(this);
    }

    async getAvailableWordsCount(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.status(401).json({ error: 'Vous devez être connecté pour jouer.' });
            }
            
            // Compter le nombre de mots disponibles pour ce niveau
            const package_id = req.query.package;
            const wordCount = await learningModel.countUserWordsByLevel(package_id, levelGame);
            
            return res.json({
                success: true,
                count: wordCount
            });
        } catch (error) {
            console.error('Erreur lors du comptage des mots disponibles:', error);
            return res.status(500).json({ error: 'Une erreur est survenue lors du comptage des mots disponibles.' });
        }
    }
   
    async getPhraseForCompletion(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.status(401).json({ error: 'Vous devez être connecté pour jouer.' });
            }
            const package_id = req.query.package;
            const previousWordId = req.query.previousWordId || null;
            
            // Récupérer un mot aléatoire du vocabulaire de l'utilisateur
            const words = await learningModel.findRandomWordsExcluding(package_id, previousWordId, 1, levelGame);
            
            if (!words || words.length === 0) {
                return res.status(404).json({ error: 'Aucun mot trouvé dans votre vocabulaire.' });
            }
            
            const word = words[0];
            
            // Générer une phrase avec le mot, basée sur l'exemple du mot ou en créant une nouvelle
            let phrase = '';
            let blankPosition = 0;
            
            if (word.example && word.example.trim() !== '') {
                // Utiliser l'exemple existant si disponible
                phrase = word.example;
                //Split the example into words and filter out excluded words
                const parts = word.word.split(' ');
                const excludedWords = ['something', 'someone', 'somebody', 'somebody', 'anything', 'everything', 'sth', 'sb', 'smth'];
                const keptWords = parts.filter(w => !excludedWords.includes(w.toLowerCase()));
                // Remplacer le mot par un blanc
                if (keptWords.length > 0) {
                    // Tạo biểu thức chính quy cho từng từ cần thay thế
                    keptWords.forEach(wordToBlank => {
                      const regex = new RegExp(`\\b${wordToBlank}\\b`, 'gi');
                      phrase = phrase.replace(regex, '_____');
                    });
                  
                    // Nếu cần tìm vị trí đầu tiên của blank
                    blankPosition = phrase.indexOf('_____');
                  }
            }
            
            return res.json({
                word_id: word.word_id,
                phrase: phrase,
                blankPosition: blankPosition,
                word: word.word,  // Nous envoyons directement le mot correct pour la vérification côté client
                meaning: word.meaning,
            });
        } catch (error) {
            console.error('Erreur lors de la génération d\'une phrase:', error);
            res.status(500).json({ error: 'Une erreur est survenue lors de la génération d\'une phrase.' });
        }
    }

    async checkPhraseAnswer(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.status(401).json({ error: 'Vous devez être connecté pour jouer.' });
            }
            
            const { userInput, correctWord } = req.body;
            
            // Comparer en ignorant la casse
            const isCorrect = userInput.toLowerCase() === correctWord.toLowerCase();
            
            return res.json({
                correct: isCorrect
            });
        } catch (error) {
            console.error('Erreur lors de la vérification de la réponse:', error);
            res.status(500).json({ error: 'Une erreur est survenue lors de la vérification de la réponse.' });
        }
    }

    // Fonction utilitaire pour mélanger un tableau
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}

module.exports = new PhraseCompletionController();