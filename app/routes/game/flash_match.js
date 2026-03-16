const express = require('express');
const router = express.Router();
const flashMatchController = require('../../controllers/gameControllers/FlashMatchController');
const { isAuthenticatedAPI } = require('../../middleware/auth');
const asyncHandler = require('../../middleware/asyncHandler');
const { validate } = require('../../validation/validate');
const { packageQuerySchema } = require('../../validation/schemas/game.schema');

router.get(
  '/cards',
  isAuthenticatedAPI,
  validate(packageQuerySchema),
  asyncHandler(flashMatchController.getCardsForFlashMatch)
);

module.exports = router;
