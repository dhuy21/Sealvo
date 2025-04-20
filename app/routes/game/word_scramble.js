const express = require('express');
const router = express.Router();
const wordScrambleController = require('../../controllers/gameControllers/WordScrambleController');

// Middleware d'authentification
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login?error=Vous devez être connecté pour accéder à cette page');
};

// Routes pour le jeu Word Scramble
router.get('/word', isAuthenticated, wordScrambleController.getRandomWordForScramble);
router.post('/check', isAuthenticated, wordScrambleController.checkWordScrambleAnswer);
router.post('/skip', isAuthenticated, wordScrambleController.skipWordInScramble);

// Route pour afficher la page de jeu Word Scramble
router.get('/', isAuthenticated, wordScrambleController.index);

module.exports = router;
