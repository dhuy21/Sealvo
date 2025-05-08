const express = require('express');
const router = express.Router();
const userController = require('../../controllers/UserController');

// Route pour modifier le profil
router.post('/edit', userController.editPost);

// Tableau de bord (protégé)
router.get('/', userController.dashboard);

module.exports = router;
