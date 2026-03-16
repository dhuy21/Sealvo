const express = require('express');
const router = express.Router();
const userController = require('../../controllers/UserController');
const { registerLimiter } = require('../../middleware/rateLimiter');
const asyncHandler = require('../../middleware/asyncHandler');
const { validate } = require('../../validation/validate');
const { registreSchema } = require('../../validation/schemas/auth.schema');

router.get('/', userController.registre);
router.post(
  '/',
  registerLimiter,
  validate(registreSchema),
  asyncHandler(userController.registrePost)
);

module.exports = router;
