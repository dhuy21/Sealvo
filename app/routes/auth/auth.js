const express = require('express');
const router = express.Router();
const googleRouter = require('./google');
const emailVerificationRouter = require('./email_verification');

// Sử dụng các route Google
router.use('/google', googleRouter);
router.use('/verify', emailVerificationRouter);

module.exports = router;