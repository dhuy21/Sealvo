const express = require('express');
const router = express.Router();
const userController = require('../../controllers/UserController');
const { registerLimiter } = require('../../middleware/rateLimiter');

router.get('/', userController.registre);
router.post('/', registerLimiter, userController.registrePost);

module.exports = router;
