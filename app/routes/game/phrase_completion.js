const express = require('express');
const router = express.Router();
const phraseCompletionController = require('../../controllers/gameControllers/PhraseCompletionController');
const { isAuthenticatedAPI } = require('../../middleware/auth');

// Route pour récupérer une phrase pour le jeu
router.get('/phrases', isAuthenticatedAPI, phraseCompletionController.getPhrasesForCompletion);

// Route pour obtenir le nombre de mots disponibles
router.get(
  '/available-words',
  isAuthenticatedAPI,
  phraseCompletionController.getAvailableWordsCount
);

module.exports = router;
