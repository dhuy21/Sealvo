const express = require('express');
const router = express.Router();
const userController = require('../../controllers/UserController');
const resetPasswordController = require('../../controllers/authControllers/ResetPasswordController');
const { isAuthenticated } = require('../../middleware/auth');
const asyncHandler = require('../../middleware/asyncHandler');
const { validate } = require('../../validation/validate');
const { resetPasswordSchema } = require('../../validation/schemas/auth.schema');
const { dashboardEditSchema } = require('../../validation/schemas/api.schema');

router.post(
  '/edit',
  isAuthenticated,
  validate(dashboardEditSchema),
  asyncHandler(userController.editPost)
);

router.post(
  '/changePassword',
  isAuthenticated,
  asyncHandler(resetPasswordController.changePasswordPost)
);
router.get('/resetPassword', isAuthenticated, resetPasswordController.resetPassword);
router.post(
  '/resetPassword',
  isAuthenticated,
  validate(resetPasswordSchema),
  asyncHandler(resetPasswordController.resetPasswordPost)
);

router.get('/', isAuthenticated, asyncHandler(userController.dashboard));

module.exports = router;
