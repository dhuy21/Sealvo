const express = require('express');
const router = express.Router();
const vocabQuizController = require('../../controllers/gameControllers/VocabQuizController');
const { isAuthenticatedAPI } = require('../../middleware/auth');

// Routes pour le jeu Vocab Quiz
router.get('/questions', isAuthenticatedAPI, vocabQuizController.getQuestionForVocabQuiz);

// Route pour obtenir le nombre de mots disponibles
router.get('/available-words', isAuthenticatedAPI, vocabQuizController.getAvailableWordsCount);

module.exports = router;
