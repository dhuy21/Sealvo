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
const { isAuthenticated, isAuthenticatedAPI } = require('../../middleware/auth');
const asyncHandler = require('../../middleware/asyncHandler');
const { validate } = require('../../validation/validate');
const { saveScoreSchema, showGameSchema } = require('../../validation/schemas/game.schema');

router.post(
  '/score',
  isAuthenticatedAPI,
  validate(saveScoreSchema),
  asyncHandler(gameController.saveScore)
);

router.get(
  '/:gameType',
  isAuthenticated,
  validate(showGameSchema),
  asyncHandler(gameController.showGame)
);

// Routes spécifiques aux jeux individuels (auth gérée dans chaque sub-router)
router.use('/wordScramble', wordScrambleRoutes);
router.use('/flashMatch', flashMatchRoutes);
router.use('/speedVocab', speedVocabRoutes);
router.use('/vocabQuiz', vocabQuizRoutes);
router.use('/phraseCompletion', phraseCompletionRoutes);
router.use('/wordSearch', wordSearchRoutes);
router.use('/testPronun', testPronunRoutes);

module.exports = router;
