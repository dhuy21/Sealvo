const express = require('express');
const router = express.Router();
const testPronunController = require('../../controllers/gameControllers/TestPronunController');
const { isAuthenticatedAPI } = require('../../middleware/auth');
const asyncHandler = require('../../middleware/asyncHandler');
const { validate } = require('../../validation/validate');
const { packageQuerySchema } = require('../../validation/schemas/game.schema');

router.get(
  '/words',
  isAuthenticatedAPI,
  validate(packageQuerySchema),
  asyncHandler(testPronunController.getWordsForTestPronun)
);

module.exports = router;
