const express = require('express');
const router = express.Router();

const reminderController = require('../controllers/apiControllers/ReminderController');
const ttsController = require('../controllers/apiControllers/TTSController');

// Route pour envoyer un message de rappel
router.post('/reminder', reminderController.reminder);

// Route pour générer de l'audio avec TTS
router.post('/tts/generate', ttsController.generateAudio);

module.exports = router;