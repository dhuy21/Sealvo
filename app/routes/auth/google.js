const express = require('express');
const router = express.Router();
const GoogleAuthController = require('../../controllers/authControllers/GoogleAuthController');
const asyncHandler = require('../../middleware/asyncHandler');

router.get('/', GoogleAuthController.getAuthUrl.bind(GoogleAuthController));
router.get(
  '/callback',
  asyncHandler(GoogleAuthController.handleCallback.bind(GoogleAuthController))
);

module.exports = router;
