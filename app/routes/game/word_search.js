const express = require('express');
const router = express.Router();
const wordSearchController = require('../../controllers/gameControllers/WordSearchController');
const { isAuthenticatedAPI } = require('../../middleware/auth');
/**
 * Routes pour le jeu WordSearch (Mots cachés)
 */

// Récupérer les mots pour le jeu
router.get('/words', isAuthenticatedAPI, wordSearchController.getWordsForGame);

module.exports = router;
