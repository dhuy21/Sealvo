const express = require('express');
const router = express.Router();
const testPronunController = require('../../controllers/gameControllers/TestPronunController');
const { isAuthenticatedAPI } = require('../../middleware/auth');

//Route pour récupérer les mots pour le jeu
router.get('/words', isAuthenticatedAPI, testPronunController.getWordsForTestPronun);

module.exports = router;
