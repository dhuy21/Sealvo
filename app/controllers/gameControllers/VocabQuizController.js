const gameScoresModel = require('../../models/game_scores');

class VocabQuizController {
    constructor() {
        // Bind all methods to maintain 'this' context
        
        this.getQuestionForVocabQuiz = this.getQuestionForVocabQuiz.bind(this);
        this.shuffleArray = this.shuffleArray.bind(this);
    }


    async index(req, res) {
        res.render('games/vocab-quiz', {
            title: 'Vocab Quiz',
            user: req.session.user
        });
    }

    async getQuestionForVocabQuiz(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.status(401).json({ error: 'Vous devez être connecté pour jouer.' });
            }
            
            const { difficulty } = req.query;
            
            // Déterminer le nombre d'options en fonction de la difficulté
            let optionsCount = 4; // Par défaut: facile
            if (difficulty === 'medium') {
                optionsCount = 6;
            } else if (difficulty === 'hard') {
                optionsCount = 8;
            }
            
            // Récupérer tous les mots de l'utilisateur
            const words = await wordModel.findWordsByUserId(req.session.user.id);
            
            if (words.length < optionsCount) {
                return res.status(404).json({ 
                    error: `Vous devez avoir au moins ${optionsCount} mots dans votre vocabulaire pour jouer à ce niveau de difficulté.` 
                });
            }
            
            // Mélanger les mots
            const shuffledWords = this.shuffleArray([...words]);
            
            // Sélectionner un mot pour la question
            const questionWord = shuffledWords[0];
            
            // Sélectionner des mots pour les options incorrectes
            const incorrectOptions = shuffledWords.slice(1, optionsCount);
            
            // Créer les options
            const options = [];
            
            // Ajouter l'option correcte
            let correctMeaning = '';
            if (questionWord.type) {
                correctMeaning += `${questionWord.type} : `;
            }
            correctMeaning += questionWord.meaning;
            
            options.push(correctMeaning);
            
            // Ajouter les options incorrectes
            incorrectOptions.forEach(word => {
                let meaning = '';
                if (word.type) {
                    meaning += `${word.type} : `;
                }
                meaning += word.meaning;
                
                options.push(meaning);
            });
            
            // Mélanger les options
            const shuffledOptions = this.shuffleArray(options);
            
            // Trouver l'index de la bonne réponse dans les options mélangées
            const correctIndex = shuffledOptions.findIndex(option => option === correctMeaning);
            
            return res.json({
                question: {
                    word: questionWord.word,
                    options: shuffledOptions,
                    correctIndex: correctIndex
                }
            });
        } catch (error) {
            console.error('Erreur lors de la récupération d\'une question:', error);
            return res.status(500).json({ error: 'Une erreur est survenue lors de la récupération d\'une question.' });
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

module.exports = new VocabQuizController();

