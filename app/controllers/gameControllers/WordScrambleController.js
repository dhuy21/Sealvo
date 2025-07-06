const wordModel = require('../../models/words');
const learningModel = require('../../models/learning');
const levelGame = '0';

class WordScrambleController {
    constructor() {
        // Bind all methods to maintain 'this' context
        this.getRandomWordForScramble = this.getRandomWordForScramble.bind(this);
        this.checkWordScrambleAnswer = this.checkWordScrambleAnswer.bind(this);
        this.skipWordInScramble = this.skipWordInScramble.bind(this);
        this.scrambleWord = this.scrambleWord.bind(this);
    }

    async getRandomWordForScramble(req, res) {
        try {
            const package_id = req.query.package;
            // Récupérer tous les mots de l'utilisateur
            const detailWordsIds = await learningModel.findWordsByLevel(package_id, levelGame);
            let words = [];
            for (const detailWordId of detailWordsIds) {
                const word = await wordModel.findById(detailWordId.detail_id);
                words.push(word);
            }
            
            // Sélectionner un mot aléatoire
            const randomIndex = Math.floor(Math.random() * words.length);
            const selectedWord = words[randomIndex];
            
            // Mélanger les lettres du mot
            const originalWord = selectedWord.word;
            const scrambledWord = this.scrambleWord(originalWord);
            
            // Construire une définition à partir des détails du mot
            let meaning = '';
            if (selectedWord.type) {
                meaning += `${selectedWord.type} : `;
            }
            meaning += selectedWord.meaning;
            
            return res.json({
                word: originalWord,
                scrambled: scrambledWord,
                meaning: meaning
            });
        } catch (error) {
            console.error('Erreur lors de la récupération d\'un mot aléatoire:', error);
            return res.status(500).json({ error: 'Une erreur est survenue lors de la récupération d\'un mot.' });
        }
    }
    
    /**
     * Vérifier la réponse pour le jeu Word Scramble
     */
    async checkWordScrambleAnswer(req, res) {
        try {
            const { answer, correctWord } = req.body;
            
            if (!answer) {
                return res.status(400).json({ error: 'Réponse manquante.' });
            }
            
            
            // Vérifier si la réponse correspond à un mot
            const iscorrectWord = correctWord.toLowerCase() === answer.toLowerCase()
            
            return res.json({
                correct: iscorrectWord,
                answer: correctWord
            });
           
        } catch (error) {
            console.error('Erreur lors de la vérification de la réponse:', error);
            return res.status(500).json({ error: 'Une erreur est survenue lors de la vérification de la réponse.' });
        }
    }
    
    /**
     * Passer un mot dans le jeu Word Scramble
     */
    async skipWordInScramble(req, res) {
        try {
            
            // Récupérer le mot actuel s'il est fourni dans la requête
            const { currentWord } = req.body;
            
            // Si le mot actuel est fourni, le renvoyer comme réponse
            if (currentWord) {
                return res.json({
                    answer: currentWord
                });
            }
            
           
        } catch (error) {
            console.error('Erreur lors du passage d\'un mot:', error);
            return res.status(500).json({ error: 'Une erreur est survenue lors du passage d\'un mot.' });
        }
    }
    
    // Méthodes utilitaires
    // Mélanger les lettres d'un mot
    scrambleWord(word) {
        const letters = word.split('');
        let scrambled = '';
        
        // S'assurer que le mot mélangé est différent de l'original
        do {
            scrambled = this.shuffleArray([...letters]).join('');
        } while (scrambled === word && word.length > 1);
        
        return scrambled;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}

module.exports = new WordScrambleController();
