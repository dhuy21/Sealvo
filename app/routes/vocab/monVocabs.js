const express = require('express');
const router = express.Router();
const wordController = require('../../controllers/WordController');

// Middleware d'authentification
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login?error=Vous devez être connecté pour accéder à cette page');
};

// Afficher tous les mots (tableau de bord)
router.get('/', isAuthenticated, wordController.monVocabs);



module.exports = router;