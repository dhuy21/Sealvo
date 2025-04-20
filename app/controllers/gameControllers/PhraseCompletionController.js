const gameScoresModel = require('../../models/game_scores');
const wordModel = require('../../models/words');

class PhraseCompletionController {
    constructor() {
        // Bind all methods to maintain 'this' context
        this.index = this.index.bind(this);
        this.getPhraseForCompletion = this.getPhraseForCompletion.bind(this);
        this.checkPhraseAnswer = this.checkPhraseAnswer.bind(this);
    }

    async index(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.redirect('/login?error=Vous devez être connecté pour accéder à cette page');
            }
            
            // Récupérer le meilleur score de l'utilisateur pour ce jeu
            const highScore = await gameScoresModel.getHighScore(req.session.user.id, 'phrase_completion');
            
            // Récupérer le classement pour ce jeu
            const leaderboard = await gameScoresModel.getLeaderboard('phrase_completion', 5);
            
            // Nombre de mots dans le vocabulaire de l'utilisateur
            const wordCount = await wordModel.countUserWords(req.session.user.id);
            
            // Vérifier si l'utilisateur a suffisamment de mots pour jouer
            const minWordsRequired = 5;
            let errorMessage = null;
            if (wordCount < minWordsRequired) {
                errorMessage = `Vous devez avoir au moins ${minWordsRequired} mots dans votre vocabulaire pour jouer à ce jeu.`;
            }
            
            res.render('games/phraseCompletion', {
                title: 'Compléter la Phrase - VocabMaster',
                user: req.session.user,
                highScore: highScore,
                leaderboard: leaderboard,
                wordCount: wordCount,
                errorMessage: errorMessage,
                gameTitle: 'Compléter la Phrase',
                gameDescription: 'Complétez les phrases en saisissant le mot manquant pour pratiquer votre vocabulaire dans un contexte.'
            });
        } catch (error) {
            console.error('Erreur lors du chargement du jeu Compléter la Phrase:', error);
            res.render('error', {
                title: 'Erreur',
                message: 'Une erreur est survenue lors du chargement du jeu Compléter la Phrase.',
                error: process.env.NODE_ENV === 'development' ? error : {}
            });
        }
    }

    async getPhraseForCompletion(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.status(401).json({ error: 'Vous devez être connecté pour jouer.' });
            }
            
            const difficulty = req.query.difficulty || 'easy';
            const previousWordId = req.query.previousWordId || null;
            
            // Récupérer un mot aléatoire du vocabulaire de l'utilisateur
            const words = await wordModel.findRandomWordsExcluding(req.session.user.id, previousWordId, 1);
            
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
                console.log('Kept words:', keptWords);
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
            } else {
                // Créer une phrase simple basée sur la difficulté
                switch (difficulty) {
                    case 'easy':
                        phrase = `Pouvez-vous compléter cette phrase avec le mot correct : "Je connais la signification du mot _____."`;
                        break;
                    case 'medium':
                        phrase = `Dans le contexte suivant, quel est le mot manquant : "Il est important de comprendre comment utiliser le mot _____ correctement."`;
                        break;
                    case 'hard':
                        phrase = `Pour démontrer votre maîtrise du vocabulaire, complétez cette phrase complexe : "L'utilisation appropriée du terme _____ peut considérablement améliorer la précision de votre communication."`;
                        break;
                    default:
                        phrase = `Complétez cette phrase : "Le mot _____ est dans votre vocabulaire."`;
                }
                blankPosition = phrase.indexOf('_____');
            }
            
            return res.json({
                word_id: word.word_id,
                phrase: phrase,
                blankPosition: blankPosition,
                word: word.word,  // Nous envoyons directement le mot correct pour la vérification côté client
                meaning: word.meaning,
                difficulty: difficulty
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