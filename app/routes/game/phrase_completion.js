const express = require('express');
const router = express.Router();
const phraseCompletionController = require('../../controllers/gameControllers/PhraseCompletionController');

// Middleware d'authentification
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login?error=Vous devez être connecté pour accéder à cette page');
};

// Route pour récupérer une phrase pour le jeu
router.get('/phrase', isAuthenticated, phraseCompletionController.getPhraseForCompletion);

// Route pour vérifier la réponse à une phrase
router.post('/check', isAuthenticated, phraseCompletionController.checkPhraseAnswer);

// Route pour afficher la page de jeu Phrase Completion
router.get('/', isAuthenticated, phraseCompletionController.index);

module.exports = router;