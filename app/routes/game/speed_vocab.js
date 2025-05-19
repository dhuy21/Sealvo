const express = require('express');
const router = express.Router();
const speedVocabController = require('../../controllers/gameControllers/SpeedVocabController');

// Middleware d'authentification
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login?error=Vous devez être connecté pour accéder à cette page');
};

// Route pour récupérer un mot pour le jeu SpeedVocab
router.get('/word', isAuthenticated, speedVocabController.getWordForSpeedVocab);

module.exports = router;