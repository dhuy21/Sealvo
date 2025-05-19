const express = require('express');
const router = express.Router();
const phraseCompletionController = require('../../controllers/gameControllers/PhraseCompletionController');

// Middleware d'authentification
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.status(401).json({ success: false, message: 'Vous devez être connecté' });
};

// Route pour récupérer une phrase pour le jeu
router.get('/phrase', isAuthenticated, phraseCompletionController.getPhraseForCompletion);

// Route pour vérifier la réponse à une phrase
router.post('/check', isAuthenticated, phraseCompletionController.checkPhraseAnswer);

// Route pour obtenir le nombre de mots disponibles
router.get('/available-words', isAuthenticated, phraseCompletionController.getAvailableWordsCount);

module.exports = router;