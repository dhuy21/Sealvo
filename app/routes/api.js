const express = require('express');
const router = express.Router();

const reminderController = require('../controllers/apiControllers/ReminderController');
const ttsController = require('../controllers/apiControllers/TTSController');
const jobController = require('../controllers/apiControllers/JobController');
const { ttsLimiter, emailLimiter } = require('../middleware/rateLimiter');
const { isAuthenticatedAPI, requireCronSecret } = require('../middleware/auth');

router.post('/reminder', requireCronSecret, emailLimiter, reminderController.reminder);
router.post('/testEmail', isAuthenticatedAPI, emailLimiter, reminderController.testEmail);
router.post('/tts/generate', isAuthenticatedAPI, ttsLimiter, ttsController.generateAudio);

router.get('/jobs/active', isAuthenticatedAPI, jobController.getActiveJobs);
router.get('/jobs/:id', isAuthenticatedAPI, jobController.getJob);
router.get('/jobs/:id/stream', isAuthenticatedAPI, jobController.streamJob);

module.exports = router;
