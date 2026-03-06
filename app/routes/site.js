const express = require('express');
const router = express.Router();

const siteController = require('../../app/controllers/SiteController');
const { feedbackLimiter } = require('../middleware/rateLimiter');

// Page "À propos de moi"
router.get('/aboutme', siteController.aboutme);
//Page "Feedback"
router.get('/feedback', siteController.feedback);
router.post('/feedback', feedbackLimiter, siteController.feedbackPost);

// Page d'accueil
router.get('/', siteController.index);

module.exports = router;
