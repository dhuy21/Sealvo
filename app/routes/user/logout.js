const express = require('express');
const router = express.Router();
const userController = require('../../controllers/UserController');
const { ensureAuthenticated } = require('../../core/passport');

// Logout route - only accessible for authenticated users
router.get('/', ensureAuthenticated, userController.logout);

module.exports = router;