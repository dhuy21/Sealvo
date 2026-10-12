const express = require('express');
const router = express.Router();
const levelProgressController = require('../controllers/LevelProgressController');
const { isAuthenticatedAPI } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { validate } = require('../validation/validate');
const { trackGameSchema, resetLevelSchema } = require('../validation/schemas/game.schema');

router.post(
  '/track',
  isAuthenticatedAPI,
  validate(trackGameSchema),
  asyncHandler(levelProgressController.trackGameCompletion)
);
router.get('/status', isAuthenticatedAPI, asyncHandler(levelProgressController.getLevelProgress));
router.post(
  '/reset',
  isAuthenticatedAPI,
  validate(resetLevelSchema),
  asyncHandler(levelProgressController.resetLevelProgress)
);

module.exports = router;
