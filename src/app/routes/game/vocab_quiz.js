const express = require('express');
const router = express.Router();
const vocabQuizController = require('../../controllers/gameControllers/VocabQuizController');
const { isAuthenticatedAPI } = require('../../middleware/auth');
const asyncHandler = require('../../middleware/asyncHandler');
const { validate } = require('../../validation/validate');
const { packageQuerySchema } = require('../../validation/schemas/game.schema');

router.get(
  '/questions',
  isAuthenticatedAPI,
  validate(packageQuerySchema),
  asyncHandler(vocabQuizController.getQuestionForVocabQuiz)
);

router.get(
  '/available-words',
  isAuthenticatedAPI,
  validate(packageQuerySchema),
  asyncHandler(vocabQuizController.getAvailableWordsCount)
);

module.exports = router;
