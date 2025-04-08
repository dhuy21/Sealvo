const express = require('express');
const router = express.Router();
const userController = require('../../controllers/UserController');

// Route pour la page de connexion
router.get('/', userController.registre);

module.exports = router;