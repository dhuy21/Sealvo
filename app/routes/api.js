const express = require('express');
const router = express.Router();

const reminderController = require('../controllers/apiControllers/ReminderController');

// Route pour envoyer un message de rappel
router.post('/reminder', reminderController.reminder);


module.exports = router;