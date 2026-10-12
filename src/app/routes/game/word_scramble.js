const express = require('express');
const router = express.Router();
const wordScrambleController = require('../../controllers/gameControllers/WordScrambleController');
const { isAuthenticatedAPI } = require('../../middleware/auth');
const asyncHandler = require('../../middleware/asyncHandler');
const { validate } = require('../../validation/validate');
const { packageQuerySchema } = require('../../validation/schemas/game.schema');

router.get(
  '/words',
  isAuthenticatedAPI,
  validate(packageQuerySchema),
  asyncHandler(wordScrambleController.getRandomWordsForScramble)
);

module.exports = router;
