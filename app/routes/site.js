const express = require('express');
const router = express.Router();

const siteController = require('../../app/controllers/SiteController');

// Middleware d'authentification
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login?error=Vous devez être connecté pour accéder à cette page');
};

// Page "À propos de moi"
router.get('/aboutme', siteController.aboutme);
//Page "Feedback"
router.get('/feedback', siteController.feedback);
router.post('/feedback', siteController.feedbackPost);

// Tableau de bord (protégé)
router.get('/dashboard', isAuthenticated, siteController.dashboard);
// Page d'accueil
router.get('/', siteController.index);

module.exports = router;