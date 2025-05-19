const express = require('express');
const router = express.Router();
const flashMatchController = require('../../controllers/gameControllers/FlashMatchController');

// Middleware d'authentification
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login?error=Vous devez être connecté pour accéder à cette page');
};

// Routes pour le jeu Flash Match
router.get('/cards', isAuthenticated, flashMatchController.getCardsForFlashMatch);



module.exports = router;