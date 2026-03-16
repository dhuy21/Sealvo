const express = require('express');
const router = express.Router();
const userController = require('../../controllers/UserController');
const asyncHandler = require('../../middleware/asyncHandler');

router.get('/', asyncHandler(userController.logout));

module.exports = router;
