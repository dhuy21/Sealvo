const express = require('express');
const router = express.Router();
const wordSearchController = require('../../controllers/gameControllers/WordSearchController');

// Middleware d'authentification
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login?error=Vous devez être connecté pour accéder à cette page');
};
/**
 * Routes pour le jeu WordSearch (Mots cachés)
 */



// Récupérer les mots pour le jeu
router.get('/words', isAuthenticated, wordSearchController.getWordsForGame);

module.exports = router;