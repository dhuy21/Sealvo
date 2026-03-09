const express = require('express');
const router = express.Router();
const userController = require('../../controllers/UserController');
const resetPasswordController = require('../../controllers/authControllers/ResetPasswordController');
const { loginLimiter, forgotPasswordLimiter } = require('../../middleware/rateLimiter');

router.get('/', userController.login);
router.post('/', loginLimiter, userController.loginPost);

router.get('/forgotPassword', resetPasswordController.forgotPassword);
router.post('/forgotPassword', forgotPasswordLimiter, resetPasswordController.forgotPasswordPost);

router.get('/resetPassword', resetPasswordController.resetPassword);
router.post('/resetPassword', loginLimiter, resetPasswordController.resetPasswordPost);

module.exports = router;
