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

// Route pour afficher la page de jeu Vocab Quiz
router.get('/', isAuthenticated, vocabQuizController.index);

module.exports = router;