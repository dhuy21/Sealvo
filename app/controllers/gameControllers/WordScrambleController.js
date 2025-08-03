const wordModel = require('../../models/words');
const learningModel = require('../../models/learning');
const levelGame = '0';

class WordScrambleController {
    constructor() {
        // Bind all methods to maintain 'this' context
        this.getRandomWordsForScramble = this.getRandomWordsForScramble.bind(this);
        this.scrambleWord = this.scrambleWord.bind(this);
    }

    async getRandomWordsForScramble(req, res) {
        try {
            const package_id = req.query.package;

            // Récupérer tous les mots de l'utilisateur
            const detailWordsIds = await learningModel.findWordsByLevel(package_id, levelGame);
            let words = [];
            for (const detailWordId of detailWordsIds) {
                let word = await wordModel.findById(detailWordId.detail_id);
                // Mélanger les lettres du mot
                const scrambledWord = this.scrambleWord(word.word);

                // Construire une définition à partir des détails du mot
                let meaning = '';
                if (word.type) {
                    meaning += `${word.type} : `;
                }
                meaning += word.meaning;

                words.push({
                    word: word.word,
                    scrambled: scrambledWord,
                    meaning: meaning
                });
            }
            words = this.shuffleArray(words);
            
            return res.json({
                words: words
            });

        } catch (error) {
            console.error('Erreur lors de la récupération d\'un mot aléatoire:', error);
            return res.status(500).json({ error: 'Une erreur est survenue lors de la récupération d\'un mot.' });
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
