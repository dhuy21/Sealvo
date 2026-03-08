const crypto = require('crypto');
const googleCloudTTS = require('../../services/google_cloud_tts');
const cache = require('../../core/cache');
const CACHE_TTL = require('../../config/cache');

/**
 * Pick a Wavenet voice deterministically based on the content.
 * Same text + same language → always the same voice → audio is cacheable.
 * Different texts may land on different voices, preserving variety.
 */
function selectVoice(voices, text, language) {
  const hash = crypto
    .createHash('md5')
    .update(text + language)
    .digest();
  const index = hash.readUInt32BE(0) % voices.length;
  return voices[index];
}

/**
 * Build a short, collision-resistant cache key from the text.
 * 12 hex chars = 48 bits ≈ 280 trillion possible values.
 */
function audioKey(text, language) {
  const hash = crypto.createHash('sha256').update(text).digest('hex').slice(0, 12);
  return `tts:audio:${language}:${hash}`;
}

class TTSController {
  async generateAudio(req, res) {
    try {
      const { text, language } = req.body;

      if (!text) {
        return res.status(400).json({
          success: false,
          message: 'Le texte est requis',
        });
      }

      if (!language) {
        return res.status(400).json({
          success: false,
          message: 'La langue est requise',
        });
      }

      // --- 1. Voice list (cache-aside) ---
      const voicesKey = `tts:voices:${language}`;
      let voices = await cache.get(voicesKey);

      if (!voices) {
        voices = await googleCloudTTS.fetchWavenetVoices(language);
        if (!voices || voices.length === 0) {
          return res.status(400).json({
            success: false,
            message: `Aucune voix disponible pour la langue: ${language}`,
          });
        }
        await cache.set(voicesKey, voices, CACHE_TTL.TTS_VOICES);
      }

      // --- 2. Deterministic voice selection ---
      const selectedVoice = selectVoice(voices, text, language);

      // --- 3. Audio (cache-aside, base64 in Redis) ---
      const aKey = audioKey(text, language);
      let audioBuffer;

      const cachedBase64 = await cache.get(aKey);
      if (cachedBase64) {
        audioBuffer = Buffer.from(cachedBase64, 'base64');
      } else {
        audioBuffer = await googleCloudTTS.synthesize(text, language, selectedVoice.name);
        await cache.set(aKey, audioBuffer.toString('base64'), CACHE_TTL.TTS_AUDIO);
      }

      // --- 4. Response ---
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(audioBuffer);
    } catch (error) {
      console.error("Erreur lors de la génération de l'audio:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la génération de l'audio",
      });
    }
  }
}

module.exports = new TTSController();
