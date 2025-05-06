const express = require('express');
const router = express.Router();
const userController = require('../../controllers/UserController');
const resetPasswordController = require('../../controllers/ResetPasswordController');

// Route pour afficher la page de connexion
router.get('/', userController.login);

// Route pour traiter la soumission du formulaire de connexion
router.post('/', userController.loginPost);

// Route pour oublier le mot de passe
router.get('/forgotPassword', resetPasswordController.forgotPassword);
router.post('/forgotPassword', resetPasswordController.forgotPasswordPost);

// Route pour réinitialiser le mot de passe
router.get('/resetPassword', resetPasswordController.resetPassword);
router.post('/resetPassword', resetPasswordController.resetPasswordPost);

module.exports = router;
  