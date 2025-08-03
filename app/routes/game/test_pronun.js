const express = require('express');
const router = express.Router();
const testPronunController = require('../../controllers/gameControllers/TestPronunController');

// Middleware d'authentification
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login?error=Vous devez être connecté pour accéder à cette page');
};

//Route pour récupérer les mots pour le jeu
router.get('/words', isAuthenticated, testPronunController.getWordsForTestPronun);

module.exports = router;