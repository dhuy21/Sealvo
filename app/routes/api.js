const express = require('express');
const router = express.Router();

const apiController = require('../controllers/APIcontroller');

// Route pour envoyer un message de rappel
router.post('/reminder', apiController.reminder);


module.exports = router;