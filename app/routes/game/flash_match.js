const express = require('express');
const router = express.Router();
const flashMatchController = require('../../controllers/gameControllers/FlashMatchController');
const { isAuthenticatedAPI } = require('../../middleware/auth');

// Routes pour le jeu Flash Match
router.get('/cards', isAuthenticatedAPI, flashMatchController.getCardsForFlashMatch);

module.exports = router;
