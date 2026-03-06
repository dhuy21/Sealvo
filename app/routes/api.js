const express = require('express');
const router = express.Router();

const reminderController = require('../controllers/apiControllers/ReminderController');
const ttsController = require('../controllers/apiControllers/TTSController');
const { ttsLimiter, emailLimiter } = require('../middleware/rateLimiter');
const { isAuthenticatedAPI } = require('../middleware/auth');

/**
 * Middleware to protect the bulk reminder endpoint.
 * Requires CRON_SECRET to be set and passed via X-Cron-Secret header.
 * This prevents unauthorized mass email sending.
 */
const requireCronSecret = (req, res, next) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('[api/reminder] CRON_SECRET is not set — endpoint disabled.');
    return res.status(503).json({ success: false, message: 'Service not configured.' });
  }
  const providedSecret = req.headers['x-cron-secret'];
  if (providedSecret !== secret) {
    return res.status(403).json({ success: false, message: 'Forbidden.' });
  }
  next();
};

router.post('/reminder', requireCronSecret, emailLimiter, reminderController.reminder);
router.post('/testEmail', isAuthenticatedAPI, emailLimiter, reminderController.testEmail);
router.post('/tts/generate', isAuthenticatedAPI, ttsLimiter, ttsController.generateAudio);

module.exports = router;
