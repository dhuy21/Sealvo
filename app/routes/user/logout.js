const express = require('express');
const router = express.Router();
const userController = require('../../controllers/UserController');


// Logout route - only accessible for authenticated users
router.get('/', userController.logout);

module.exports = router;