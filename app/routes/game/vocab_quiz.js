const express = require('express');
const router = express.Router();
const vocabQuizController = require('../../controllers/gameControllers/VocabQuizController');

// Middleware d'authentification
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login?error=Vous devez être connecté pour accéder à cette page');
};

// Routes pour le jeu Vocab Quiz
router.get('/question', isAuthenticated, vocabQuizController.getQuestionForVocabQuiz);

// Route pour obtenir le nombre de mots disponibles
router.get('/available-words', isAuthenticated, vocabQuizController.getAvailableWordsCount);

module.exports = router;