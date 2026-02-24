const express = require('express');
const router = express.Router();
const userController = require('../../controllers/UserController');
const resetPasswordController = require('../../controllers/authControllers/ResetPasswordController');
const { isAuthenticated } = require('../../middleware/auth');

// Route pour modifier le profil
router.post('/edit', isAuthenticated, userController.editPost);

// Route pour changer le mot de passe
router.post('/changePassword', isAuthenticated, resetPasswordController.changePasswordPost);
router.get('/resetPassword', isAuthenticated, resetPasswordController.resetPassword);
router.post('/resetPassword', isAuthenticated, resetPasswordController.resetPasswordPost);

// Tableau de bord (protégé)
router.get('/', isAuthenticated, userController.dashboard);

module.exports = router;
