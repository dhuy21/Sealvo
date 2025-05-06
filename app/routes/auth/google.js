const express = require('express');
const router = express.Router();
const GoogleAuthController = require('../../controllers/authControllers/GoogleAuthController');

// Chuyển hướng tới Google để xác thực
router.get('/', GoogleAuthController.getAuthUrl.bind(GoogleAuthController));

// Callback sau khi Google xác thực
router.get('/callback', GoogleAuthController.handleCallback.bind(GoogleAuthController));

module.exports = router;