const express = require('express');
const router = express.Router();
const emailVerificationController = require('../../controllers/authControllers/EmailVerificationController');


router.get('/', emailVerificationController.verifyEmail);

module.exports = router;