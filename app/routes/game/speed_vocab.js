const express = require('express');
const router = express.Router();
const speedVocabController = require('../../controllers/gameControllers/SpeedVocabController');
const { isAuthenticatedAPI } = require('../../middleware/auth');

// Route pour récupérer un mot pour le jeu SpeedVocab
router.get('/words', isAuthenticatedAPI, speedVocabController.getWordsForSpeedVocab);

module.exports = router;
