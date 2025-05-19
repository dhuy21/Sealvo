const express = require('express');
const router = express.Router();
const levelProgressController = require('../controllers/LevelProgressController');

// Middleware d'authentification
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.status(401).json({ success: false, message: 'Vous devez être connecté' });
};

// Routes pour le suivi de la progression de niveau
router.post('/track', isAuthenticated, levelProgressController.trackGameCompletion);
router.get('/status', isAuthenticated, levelProgressController.getLevelProgress);
router.post('/reset', isAuthenticated, levelProgressController.resetLevelProgress);

module.exports = router; 