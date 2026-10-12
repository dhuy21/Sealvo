const express = require('express');
const router = express.Router();
const userController = require('../../controllers/UserController');
const resetPasswordController = require('../../controllers/authControllers/ResetPasswordController');
const { loginLimiter, forgotPasswordLimiter } = require('../../middleware/rateLimiter');
const asyncHandler = require('../../middleware/asyncHandler');
const { validate } = require('../../validation/validate');
const {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../../validation/schemas/auth.schema');

router.get('/', userController.login);
router.post('/', loginLimiter, validate(loginSchema), asyncHandler(userController.loginPost));

router.get('/forgotPassword', resetPasswordController.forgotPassword);
router.post(
  '/forgotPassword',
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(resetPasswordController.forgotPasswordPost)
);

router.get('/resetPassword', resetPasswordController.resetPassword);
router.post(
  '/resetPassword',
  loginLimiter,
  validate(resetPasswordSchema),
  asyncHandler(resetPasswordController.resetPasswordPost)
);

module.exports = router;
