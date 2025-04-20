const gameScoresModel = require('../../models/game_scores');
const wordModel = require('../../models/words');

class WordScrambleController {
    constructor() {
        // Bind all methods to maintain 'this' context
        this.getRandomWordForScramble = this.getRandomWordForScramble.bind(this);
        this.checkWordScrambleAnswer = this.checkWordScrambleAnswer.bind(this);
        this.skipWordInScramble = this.skipWordInScramble.bind(this);
        this.scrambleWord = this.scrambleWord.bind(this);
    }
    
    /**
     * Récupérer un mot aléatoire pour le jeu Word Scramble
     */
    async index(req, res) {
        res.render('games/word-scramble', {
            title: 'Word Scramble',
            user: req.session.user
        });
    }
    
    async getRandomWordForScramble(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.status(401).json({ error: 'Vous devez être connecté pour jouer.' });
            }
            
            // Récupérer tous les mots de l'utilisateur
            const words = await wordModel.findWordsByUserId(req.session.user.id);
            
            if (words.length === 0) {
                return res.status(404).json({ 
                    error: 'Vous n\'avez pas encore ajouté de mots à votre vocabulaire.' 
                });
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
            const { answer } = req.body;
            
            if (!answer) {
                return res.status(400).json({ error: 'Réponse manquante.' });
            }
            
            // Récupérer tous les mots de l'utilisateur
            const words = await wordModel.findWordsByUserId(req.session.user.id);
            
            // Vérifier si la réponse correspond à un mot
            const correctWord = words.find(word => 
                word.word.toLowerCase() === answer.toLowerCase()
            );
            
            if (correctWord) {
                return res.json({
                    correct: true,
                    answer: correctWord.word
                });
            } else {
                return res.json({
                    correct: false,
                    answer: "???" // On ne donne pas la réponse pour l'instant
                });
            }
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
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.status(401).json({ error: 'Vous devez être connecté pour jouer.' });
            }
            
            // On peut renvoyer un mot aléatoire comme réponse
            // C'est une approche simple, mais on pourrait aussi enregistrer le mot en cours
            // dans la session et le renvoyer ici
            
            // Récupérer tous les mots de l'utilisateur
            const words = await wordModel.findWordsByUserId(req.session.user.id);
            
            if (words.length === 0) {
                return res.status(404).json({ 
                    error: 'Vous n\'avez pas encore ajouté de mots à votre vocabulaire.' 
                });
            }
            
            // Sélectionner un mot aléatoire
            const randomIndex = Math.floor(Math.random() * words.length);
            const selectedWord = words[randomIndex];
            
            return res.json({
                answer: selectedWord.word
            });
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
