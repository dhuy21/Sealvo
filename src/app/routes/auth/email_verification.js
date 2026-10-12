const express = require('express');
const router = express.Router();
const emailVerificationController = require('../../controllers/authControllers/EmailVerificationController');
const asyncHandler = require('../../middleware/asyncHandler');

router.get('/:token', asyncHandler(emailVerificationController.verifyEmail));

module.exports = router;
