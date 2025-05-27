const express = require('express');
const router = express.Router();
const wordScrambleRoutes = require('./word_scramble');
const flashMatchRoutes = require('./flash_match');
const speedVocabRoutes = require('./speed_vocab');
const vocabQuizRoutes = require('./vocab_quiz');
const phraseCompletionRoutes = require('./phrase_completion');
const wordSearchRoutes = require('./word_search');
const testPronunRoutes = require('./test_pronun');
const gameController = require('../../controllers/gameControllers/GameController');

// Middleware d'authentification
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login?error=Vous devez être connecté pour accéder à cette page');
};

// Page d'accueil des jeux
router.get('/', isAuthenticated, gameController.index);

// Route pour afficher un jeu spécifique directement depuis GameController
router.get('/:gameType', isAuthenticated, gameController.showGame);

// Routes spécifiques aux jeux individuels
router.use('/wordScramble', isAuthenticated, wordScrambleRoutes);
router.use('/flashMatch', isAuthenticated, flashMatchRoutes);
router.use('/speedVocab', isAuthenticated, speedVocabRoutes);
router.use('/vocabQuiz', isAuthenticated, vocabQuizRoutes);
router.use('/phraseCompletion', isAuthenticated, phraseCompletionRoutes);
router.use('/wordSearch', isAuthenticated, wordSearchRoutes);
router.use('/testPronun', isAuthenticated, testPronunRoutes);

module.exports = router;