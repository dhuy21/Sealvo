const express = require('express');
const router = express.Router();
const wordScrambleController = require('../../controllers/gameControllers/WordScrambleController');
const { isAuthenticatedAPI } = require('../../middleware/auth');

// Routes pour le jeu Word Scramble
router.get('/words', isAuthenticatedAPI, wordScrambleController.getRandomWordsForScramble);

module.exports = router;
