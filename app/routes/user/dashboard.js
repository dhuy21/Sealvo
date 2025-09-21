const express = require('express');
const router = express.Router();
const userController = require('../../controllers/UserController');
const resetPasswordController = require('../../controllers/authControllers/ResetPasswordController');

// Route pour modifier le profil
router.post('/edit', userController.editPost);

// Route pour changer le mot de passe
router.post('/changePassword', resetPasswordController.changePasswordPost);
router.get('/resetPassword', resetPasswordController.resetPassword);
router.post('/resetPassword', resetPasswordController.resetPasswordPost);

// Tableau de bord (protégé)
router.get('/', userController.dashboard);

module.exports = router;
