const wordModel = require('../models/words');

class WordController {
    // Afficher la page de vocabulaire
    async monVocabs(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.redirect('/login?error=Vous devez être connecté pour accéder à cette page');
            }

            // Récupérer tous les mots de l'utilisateur
            const words = await wordModel.findWordsByUserId(req.session.user.id);

            // Grouper les mots par niveau
            const wordsByLevel = {};
            words.forEach(word => {
                if (!wordsByLevel[word.level]) {
                    wordsByLevel[word.level] = [];
                }
                wordsByLevel[word.level].push(word);
            });

            res.render('monVocabs', {
                title: 'Mon Vocabulaire',
                user: req.session.user,
                words: words,
                wordsByLevel: wordsByLevel,
                hasWords: words.length > 0
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des mots:', error);
            res.render('monVocabs', {
                title: 'Mon Vocabulaire',
                user: req.session.user,
                error: 'Une erreur est survenue lors de la récupération de vos mots.'
            });
        }
    }

    
}

module.exports = new WordController();
