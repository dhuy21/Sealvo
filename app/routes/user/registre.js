const express = require('express');
const router = express.Router();
const userController = require('../../controllers/UserController');

// Route pour afficher la page d'inscription
router.get('/', userController.registre);

// Route pour traiter la soumission du formulaire d'inscription
router.post('/', userController.registrePost);

module.exports = router;