const express = require('express');
const router = express.Router();
const userController = require('../../controllers/UserController');

// Route pour afficher la page de connexion
router.get('/', userController.login);

// Route pour traiter la soumission du formulaire de connexion
router.post('/', userController.loginPost);

module.exports = router;
  