const googleCloudTTS = require('../../services/google_cloud_tts');

class TTSController {
    async generateAudio(req, res) {
        try {
            const { text, language } = req.body;
            
            if (!text) {
                return res.status(400).json({
                    success: false,
                    message: 'Le texte est requis'
                });
            }
            
            if (!language) {
                return res.status(400).json({
                    success: false,
                    message: 'La langue est requise'
                });
            }
            
            // Obtenir une voix aléatoire pour la langue
            const selectedVoice = await googleCloudTTS.getVoiceList(language);
            
            if (!selectedVoice) {
                return res.status(400).json({
                    success: false,
                    message: `Aucune voix disponible pour la langue: ${language}`
                });
            }
            
            // Générer l'audio buffer
            const audioBuffer = await googleCloudTTS.generateAudio(text, language, selectedVoice.name);
            
            // Streamer l'audio directement (plus efficace)
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Length', audioBuffer.length);
            res.setHeader('Cache-Control', 'public, max-age=300'); // Cache 5 min
            res.send(audioBuffer);
            
        } catch (error) {
            console.error('Erreur lors de la génération de l\'audio:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la génération de l\'audio'
            });
        }
    }
}

module.exports = new TTSController();