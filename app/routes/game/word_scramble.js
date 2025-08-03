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
router.get('/words', isAuthenticated, wordScrambleController.getRandomWordsForScramble);

module.exports = router;
