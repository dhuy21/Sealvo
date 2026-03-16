const express = require('express');
const router = express.Router();

const reminderController = require('../controllers/apiControllers/ReminderController');
const ttsController = require('../controllers/apiControllers/TTSController');
const jobController = require('../controllers/apiControllers/JobController');
const { ttsLimiter, emailLimiter } = require('../middleware/rateLimiter');
const { isAuthenticatedAPI, requireCronSecret } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { validate } = require('../validation/validate');
const { ttsGenerateSchema } = require('../validation/schemas/api.schema');

router.post(
  '/reminder',
  requireCronSecret,
  emailLimiter,
  asyncHandler(reminderController.reminder)
);
router.post(
  '/testEmail',
  isAuthenticatedAPI,
  emailLimiter,
  asyncHandler(reminderController.testEmail)
);
router.post(
  '/tts/generate',
  isAuthenticatedAPI,
  ttsLimiter,
  validate(ttsGenerateSchema),
  asyncHandler(ttsController.generateAudio)
);

router.get('/jobs/active', isAuthenticatedAPI, asyncHandler(jobController.getActiveJobs));
router.get('/jobs/:id', isAuthenticatedAPI, asyncHandler(jobController.getJob));
router.get('/jobs/:id/stream', isAuthenticatedAPI, asyncHandler(jobController.streamJob));

module.exports = router;
