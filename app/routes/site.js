const express = require('express');
const router = express.Router();

const siteController = require('../../app/controllers/SiteController');
const { feedbackLimiter } = require('../middleware/rateLimiter');
const asyncHandler = require('../middleware/asyncHandler');
const { validate } = require('../validation/validate');
const { feedbackSchema } = require('../validation/schemas/site.schema');

router.get('/aboutme', siteController.aboutme);
router.get('/feedback', siteController.feedback);
router.post(
  '/feedback',
  feedbackLimiter,
  validate(feedbackSchema),
  asyncHandler(siteController.feedbackPost)
);

router.get('/', siteController.index);

module.exports = router;
