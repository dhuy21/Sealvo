const express = require('express');
const router = express.Router();
const googleRouter = require('./google');

// Sử dụng các route Google
router.use('/google', googleRouter);

module.exports = router;