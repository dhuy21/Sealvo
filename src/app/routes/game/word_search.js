const express = require('express');
const router = express.Router();
const wordSearchController = require('../../controllers/gameControllers/WordSearchController');
const { isAuthenticatedAPI } = require('../../middleware/auth');
const asyncHandler = require('../../middleware/asyncHandler');
const { validate } = require('../../validation/validate');
const { packageQuerySchema } = require('../../validation/schemas/game.schema');

router.get(
  '/words',
  isAuthenticatedAPI,
  validate(packageQuerySchema),
  asyncHandler(wordSearchController.getWordsForGame)
);

module.exports = router;
