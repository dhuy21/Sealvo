const express = require('express');
const router = express.Router();
const levelProgressController = require('../controllers/LevelProgressController');
const { isAuthenticatedAPI } = require('../middleware/auth');

// Routes pour le suivi de la progression de niveau
router.post('/track', isAuthenticatedAPI, levelProgressController.trackGameCompletion);
router.get('/status', isAuthenticatedAPI, levelProgressController.getLevelProgress);
router.post('/reset', isAuthenticatedAPI, levelProgressController.resetLevelProgress);

module.exports = router;
