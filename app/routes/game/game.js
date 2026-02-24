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
const { isAuthenticated } = require('../../middleware/auth');

// Page d'accueil des jeux
router.get('/', isAuthenticated, gameController.index);

// Route pour afficher un jeu spécifique directement depuis GameController
router.get('/:gameType', isAuthenticated, gameController.showGame);

// Routes spécifiques aux jeux individuels (auth gérée dans chaque sub-router)
router.use('/wordScramble', wordScrambleRoutes);
router.use('/flashMatch', flashMatchRoutes);
router.use('/speedVocab', speedVocabRoutes);
router.use('/vocabQuiz', vocabQuizRoutes);
router.use('/phraseCompletion', phraseCompletionRoutes);
router.use('/wordSearch', wordSearchRoutes);
router.use('/testPronun', testPronunRoutes);

module.exports = router;
