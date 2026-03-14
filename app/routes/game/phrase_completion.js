const express = require('express');
const router = express.Router();
const phraseCompletionController = require('../../controllers/gameControllers/PhraseCompletionController');
const { isAuthenticatedAPI } = require('../../middleware/auth');
const asyncHandler = require('../../middleware/asyncHandler');
const { validate } = require('../../validation/validate');
const { packageQuerySchema } = require('../../validation/schemas/game.schema');

router.get(
  '/phrases',
  isAuthenticatedAPI,
  validate(packageQuerySchema),
  asyncHandler(phraseCompletionController.getPhrasesForCompletion)
);

router.get(
  '/available-words',
  isAuthenticatedAPI,
  validate(packageQuerySchema),
  asyncHandler(phraseCompletionController.getAvailableWordsCount)
);

module.exports = router;
